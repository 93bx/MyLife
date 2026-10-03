import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks } from "@/db/schema";
import { skipTask } from "@/domain/skipTask";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  let result;
  try {
    result = skipTask({ status: task.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "cannot skip";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await db
    .update(tasks)
    .set({ status: result.taskStatus })
    .where(eq(tasks.id, id));

  return NextResponse.json({ taskStatus: result.taskStatus });
}
