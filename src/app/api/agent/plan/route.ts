import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  aiEndpoints,
  planWeeks,
  profiles,
  projects,
  tasks,
  transactions,
} from "@/db/schema";
import { cashBalance } from "@/domain/money";
import { FreeAiExhaustedError, chatFree } from "@/lib/ai/freeGateway";
import {
  buildPlanAgentMessages,
  parsePlanAgentJson,
  resolvePlanScope,
  riyadhWeekStartFriday,
  type PlanAgentResult,
  type PlanScope,
} from "@/lib/ai/planPrompt";
import { filterEndpointsForSlice } from "@/lib/ai/slice";
import type { AiEndpoint, AiEndpointKind } from "@/lib/ai/types";

type PlanBody = {
  text?: string;
  scope?: PlanScope;
  intentText?: string;
  nightsOn?: boolean;
};

async function upsertPlanWeekIntent(opts: {
  weekStart: string;
  intentText: string;
  nightsOn?: boolean;
  overloadWarned?: boolean;
  intentOnly: boolean;
}) {
  const [existing] = await db
    .select()
    .from(planWeeks)
    .where(eq(planWeeks.weekStart, opts.weekStart))
    .limit(1);

  if (existing) {
    const patch: {
      intentText: string;
      nightsOn?: boolean;
      overloadWarned?: boolean;
    } = { intentText: opts.intentText };
    if (!opts.intentOnly) {
      if (typeof opts.nightsOn === "boolean") patch.nightsOn = opts.nightsOn;
      if (typeof opts.overloadWarned === "boolean") {
        patch.overloadWarned = opts.overloadWarned;
      }
    }
    await db
      .update(planWeeks)
      .set(patch)
      .where(eq(planWeeks.id, existing.id));
    return;
  }

  await db.insert(planWeeks).values({
    weekStart: opts.weekStart,
    intentText: opts.intentText,
    nightsOn: opts.nightsOn ?? true,
    overloadWarned: opts.overloadWarned ?? false,
  });
}

async function applyPlanTasks(result: PlanAgentResult) {
  if (!result.tasks?.length) return;

  const projectRows = await db.select().from(projects);
  const byTitle = new Map(
    projectRows.map((p) => [p.title.toLowerCase(), p.id] as const),
  );

  for (const item of result.tasks) {
    let projectId: string | undefined;
    if (item.projectHint) {
      projectId = byTitle.get(item.projectHint.toLowerCase());
    }

    if (item.id) {
      const [found] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, item.id))
        .limit(1);
      if (!found) continue;
      await db
        .update(tasks)
        .set({
          title: item.title,
          type: item.type,
          priority: item.priority,
          resources: item.resources,
          floating: item.floating,
          ...(projectId ? { projectId } : {}),
        })
        .where(eq(tasks.id, item.id));
      continue;
    }

    await db.insert(tasks).values({
      title: item.title,
      type: item.type,
      priority: item.priority,
      resources: item.resources,
      floating: item.floating,
      status: "open",
      ...(projectId ? { projectId } : {}),
    });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PlanBody;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const scopeIn: PlanScope =
    body.scope === "week" || body.scope === "day" || body.scope === "auto"
      ? body.scope
      : "auto";
  const scope = resolvePlanScope(scopeIn, text);
  const intentText =
    typeof body.intentText === "string" ? body.intentText : text;
  const weekStart = riyadhWeekStartFriday();

  const openTaskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      type: tasks.type,
      priority: tasks.priority,
      resources: tasks.resources,
      estimateMinutes: tasks.estimateMinutes,
      status: tasks.status,
    })
    .from(tasks)
    .where(eq(tasks.status, "open"));

  const txnRows = await db.select().from(transactions);
  const balanceSar = cashBalance(
    txnRows.map((t) => ({
      direction: t.direction as "in" | "out",
      amountSar: Number(t.amountSar),
    })),
  );

  const [weekRow] = await db
    .select()
    .from(planWeeks)
    .where(eq(planWeeks.weekStart, weekStart))
    .limit(1);

  const nightsOn =
    typeof body.nightsOn === "boolean"
      ? body.nightsOn
      : (weekRow?.nightsOn ?? true);

  const endpointRows = await db
    .select()
    .from(aiEndpoints)
    .orderBy(asc(aiEndpoints.sortOrder));
  const [profile] = await db.select().from(profiles).limit(1);
  const allowTrain = profile?.allowTrainOnFreeNonMoney ?? false;

  const endpoints: AiEndpoint[] = endpointRows
    .filter((e) => e.enabled)
    .map((e) => ({
      name: e.name,
      kind: e.kind as AiEndpointKind,
      baseUrl: e.baseUrl,
      apiKey: e.apiKey,
      model: e.model ?? "",
      trainsOnPrompts: e.trainsOnPrompts,
      enabled: e.enabled,
    }));

  const filtered = filterEndpointsForSlice(endpoints, "general", allowTrain);
  const messages = buildPlanAgentMessages(
    {
      scope,
      openTasks: openTaskRows.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        priority: t.priority,
        resources: t.resources,
        estimateMinutes: t.estimateMinutes,
      })),
      weekFlags: {
        nightsOn,
        intentText: weekRow?.intentText ?? intentText,
      },
      cashBalanceSar: balanceSar,
    },
    text,
  );

  let content: string;
  let usedEndpointName: string;
  try {
    const result = await chatFree(filtered, messages);
    content = result.content;
    usedEndpointName = result.usedEndpointName;
  } catch (err) {
    if (err instanceof FreeAiExhaustedError) {
      return NextResponse.json(
        { error: "All free AI endpoints failed" },
        { status: 503 },
      );
    }
    throw err;
  }

  const parsed = parsePlanAgentJson(content);
  if (!parsed) {
    await upsertPlanWeekIntent({
      weekStart,
      intentText,
      intentOnly: true,
    });
    return NextResponse.json({
      applied: false,
      raw: content,
      usedEndpointName,
    });
  }

  const appliedNights =
    typeof parsed.nightsOn === "boolean" ? parsed.nightsOn : nightsOn;

  await upsertPlanWeekIntent({
    weekStart,
    intentText,
    nightsOn: appliedNights,
    overloadWarned: Boolean(parsed.warning),
    intentOnly: false,
  });

  await applyPlanTasks(parsed);

  return NextResponse.json({
    applied: true,
    warning: parsed.warning,
    nightsOn: appliedNights,
    usedEndpointName,
  });
}