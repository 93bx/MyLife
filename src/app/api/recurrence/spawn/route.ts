import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recurrenceTemplates, tasks } from "@/db/schema";
import {
  neededInstance,
  type RecurrenceKind,
  type RecurrenceTemplate,
} from "@/domain/recurrence";
import type { TaskResources } from "@/domain/types";

export async function POST() {
  const templates = await db
    .select()
    .from(recurrenceTemplates)
    .where(eq(recurrenceTemplates.enabled, true));

  const asOf = new Date();
  const spawned: { templateId: string; dueFor: string; title: string }[] = [];

  for (const row of templates) {
    const existing = await db
      .select({ dueFor: tasks.dueFor })
      .from(tasks)
      .where(eq(tasks.recurrenceTemplateId, row.id));

    const existingDueForDates = existing
      .map((t) => t.dueFor)
      .filter((d): d is string => d != null);

    const template: RecurrenceTemplate = {
      id: row.id,
      rruleOrKind: row.rruleOrKind as RecurrenceKind,
      title: row.title,
      type: row.type,
      resources: row.resources as TaskResources,
      plannedSar: row.plannedSar == null ? 0 : Number(row.plannedSar),
    };

    const need = neededInstance(template, asOf, existingDueForDates);
    if (!need) continue;

    await db.insert(tasks).values({
      title: need.title,
      status: "open",
      priority: "P1",
      tags: "[]",
      type: row.type,
      resources: row.resources,
      plannedSar: row.plannedSar,
      floating: true,
      recurrenceTemplateId: row.id,
      dueFor: need.dueFor,
    });

    spawned.push({
      templateId: row.id,
      dueFor: need.dueFor,
      title: need.title,
    });
  }

  return NextResponse.json({ spawned });
}
