import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { goals, projects, tasks } from "@/db/schema";
import { parseCreateTaskBody } from "@/domain/createTask";
import { serializeTags } from "@/domain/taskTags";

export async function GET() {
  const rows = await db.select().from(tasks).orderBy(desc(tasks.deadline));
  return NextResponse.json({ tasks: rows });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  let fields;
  try {
    fields = parseCreateTaskBody(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (fields.goalId) {
    const [g] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(eq(goals.id, fields.goalId))
      .limit(1);
    if (!g) {
      return NextResponse.json({ error: "unknown goalId" }, { status: 400 });
    }
  }
  if (fields.projectId) {
    const [p] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, fields.projectId))
      .limit(1);
    if (!p) {
      return NextResponse.json({ error: "unknown projectId" }, { status: 400 });
    }
  }

  const [row] = await db
    .insert(tasks)
    .values({
      title: fields.title,
      status: "open",
      priority: fields.priority,
      tags: serializeTags(fields.tags),
      type: fields.type,
      resources: fields.resources,
      deadline: fields.deadline ? new Date(fields.deadline) : null,
      floating: fields.floating,
      goalId: fields.goalId,
      projectId: fields.projectId,
    })
    .returning();

  return NextResponse.json({ task: row }, { status: 201 });
}
