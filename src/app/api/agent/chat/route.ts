import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { aiEndpoints, profiles, settings } from "@/db/schema";
import { FreeAiExhaustedError, chatFree } from "@/lib/ai/freeGateway";
import { filterEndpointsForSlice } from "@/lib/ai/slice";
import type { AiEndpoint, AiEndpointKind, ChatMessage } from "@/lib/ai/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
  };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }

  const [settingsRow] = await db.select().from(settings).limit(1);
  if (settingsRow?.agentMuted) {
    return NextResponse.json(
      { error: "Agent is muted in settings" },
      { status: 403 },
    );
  }

  const rows = await db
    .select()
    .from(aiEndpoints)
    .orderBy(asc(aiEndpoints.sortOrder));

  const [profile] = await db.select().from(profiles).limit(1);
  const allowTrain = profile?.allowTrainOnFreeNonMoney ?? false;

  const endpoints: AiEndpoint[] = rows
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

  try {
    const result = await chatFree(filtered, body.messages);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FreeAiExhaustedError) {
      return NextResponse.json(
        { error: "All free AI endpoints failed" },
        { status: 503 },
      );
    }
    throw err;
  }
}
