import { asc, desc, eq, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import { googleCalendarSelections } from "@/db/schema";
import { createCalendarClient, listCalendars } from "./calendarClient";
import { registerChannel, stopChannel } from "./sync";

export async function syncCalendarSelectionsFromGoogle(
  accessToken: string,
): Promise<void> {
  const client = createCalendarClient(accessToken);
  const fromGoogle = await listCalendars(client);
  const existing = await db.select().from(googleCalendarSelections);
  const selectedByCalendarId = new Map(
    existing.map((row) => [row.calendarId, row.selected]),
  );

  const googleCalendarIds: string[] = [];
  for (const cal of fromGoogle) {
    if (!cal.id) {
      continue;
    }
    googleCalendarIds.push(cal.id);
    const isPrimary = cal.primary === true;
    const summary = cal.summary ?? cal.id;
    const selected = isPrimary
      ? true
      : (selectedByCalendarId.get(cal.id) ?? false);

    const [row] = await db
      .select()
      .from(googleCalendarSelections)
      .where(eq(googleCalendarSelections.calendarId, cal.id))
      .limit(1);

    if (row) {
      await db
        .update(googleCalendarSelections)
        .set({ summary, isPrimary, selected: isPrimary ? true : selected })
        .where(eq(googleCalendarSelections.id, row.id));
    } else {
      await db.insert(googleCalendarSelections).values({
        calendarId: cal.id,
        summary,
        isPrimary,
        selected,
      });
    }
  }

  if (googleCalendarIds.length > 0) {
    const stale = await db
      .select()
      .from(googleCalendarSelections)
      .where(notInArray(googleCalendarSelections.calendarId, googleCalendarIds));
    for (const row of stale) {
      await stopChannel(row.calendarId);
      await db
        .delete(googleCalendarSelections)
        .where(eq(googleCalendarSelections.id, row.id));
    }
  }

  await registerChannelsForSelectedCalendars();
}

export function isPushUnavailable(): boolean {
  return !process.env.GOOGLE_WEBHOOK_URL?.trim();
}

export async function registerChannelsForSelectedCalendars(): Promise<void> {
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return;
  }

  const selected = await db
    .select()
    .from(googleCalendarSelections)
    .where(eq(googleCalendarSelections.selected, true));

  for (const cal of selected) {
    await registerChannel(cal.calendarId, webhookUrl);
  }
}

export async function applyCalendarSelectionPatch(
  calendarId: string,
  selected: boolean,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const [row] = await db
    .select()
    .from(googleCalendarSelections)
    .where(eq(googleCalendarSelections.calendarId, calendarId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "Calendar not found", status: 404 };
  }

  if (row.isPrimary && !selected) {
    return {
      ok: false,
      error: "Primary calendar must stay selected",
      status: 400,
    };
  }

  if (row.selected === selected) {
    return { ok: true };
  }

  await db
    .update(googleCalendarSelections)
    .set({ selected })
    .where(eq(googleCalendarSelections.id, row.id));

  if (selected) {
    const webhookUrl = process.env.GOOGLE_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      await registerChannel(calendarId, webhookUrl);
    }
  } else {
    await stopChannel(calendarId);
  }

  return { ok: true };
}

export type CalendarSelectionRow = typeof googleCalendarSelections.$inferSelect;

export async function listCalendarSelectionRows(): Promise<
  CalendarSelectionRow[]
> {
  return db
    .select()
    .from(googleCalendarSelections)
    .orderBy(
      desc(googleCalendarSelections.isPrimary),
      asc(googleCalendarSelections.summary),
    );
}
