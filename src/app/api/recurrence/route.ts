import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { recurrenceTemplates, tasks } from "@/db/schema";
import { pickLatestInstance } from "@/domain/recurrenceIndex";

export async function GET() {
  const templates = await db
    .select()
    .from(recurrenceTemplates)
    .orderBy(asc(recurrenceTemplates.title));
  const allTasks = await db
    .select({
      recurrenceTemplateId: tasks.recurrenceTemplateId,
      dueFor: tasks.dueFor,
      status: tasks.status,
    })
    .from(tasks);

  const byTemplate = new Map<
    string,
    { dueFor: string | null; status: string }[]
  >();
  for (const t of allTasks) {
    if (t.recurrenceTemplateId == null) continue;
    const list = byTemplate.get(t.recurrenceTemplateId) ?? [];
    list.push({ dueFor: t.dueFor, status: t.status });
    byTemplate.set(t.recurrenceTemplateId, list);
  }

  return NextResponse.json({
    templates: templates.map((row) => ({
      id: row.id,
      title: row.title,
      rruleOrKind: row.rruleOrKind,
      resources: row.resources,
      type: row.type,
      plannedSar: row.plannedSar,
      enabled: row.enabled,
      latestInstance: pickLatestInstance(byTemplate.get(row.id) ?? []),
    })),
  });
}
