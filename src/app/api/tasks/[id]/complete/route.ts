import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks, transactions } from "@/db/schema";
import { completeTaskService } from "@/domain/completeTask";
import type { TaskResources } from "@/domain/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    actualSar?: number;
    minutes?: number;
  };

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  let result;
  try {
    result = completeTaskService(
      {
        id: task.id,
        resources: task.resources as TaskResources,
        status: task.status,
        type: task.type,
      },
      { actualSar: body.actualSar },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid completion";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (result.transaction) {
    await db.insert(transactions).values({
      direction: result.transaction.direction,
      amountSar: String(result.transaction.amountSar),
      taskId: result.transaction.taskId,
    });
  }

  await db
    .update(tasks)
    .set({ status: result.taskStatus })
    .where(eq(tasks.id, id));

  return NextResponse.json({
    taskStatus: result.taskStatus,
    transaction: result.transaction,
    minutes: body.minutes ?? null,
  });
}
