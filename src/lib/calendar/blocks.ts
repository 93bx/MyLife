import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarBlocks, googleCalendarSelections } from "@/db/schema";
import {
  mergeCalendarItems,
  type CalendarItem,
  type CalendarWindow,
} from "@/domain/calendarMerge";
import { agentMayModify } from "@/domain/calendarOwnership";

export type CalendarBlockRow = typeof calendarBlocks.$inferSelect;

export type CalendarBlockDto = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  ownedByApp: boolean;
  mirrored: boolean;
  dirty: boolean;
  taskId: string | null;
  googleEventId: string | null;
  googleCalendarId: string | null;
  editable: boolean;
};

function toItem(row: CalendarBlockRow): CalendarItem {
  return {
    id: row.id,
    title: row.mirrored ? (row.foreignSummary ?? row.title) : row.title,
    startAt: row.startAt,
    endAt: row.endAt,
    ownedByApp: row.ownedByApp,
    mirrored: row.mirrored,
  };
}

function toDto(row: CalendarBlockRow): CalendarBlockDto {
  return {
    id: row.id,
    title: row.mirrored ? (row.foreignSummary ?? row.title) : row.title,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    ownedByApp: row.ownedByApp,
    mirrored: row.mirrored,
    dirty: row.dirty,
    taskId: row.taskId,
    googleEventId: row.googleEventId,
    googleCalendarId: row.googleCalendarId,
    editable: agentMayModify(row),
  };
}

export async function resolvePrimaryGoogleCalendarId(): Promise<string | null> {
  const [primary] = await db
    .select()
    .from(googleCalendarSelections)
    .where(eq(googleCalendarSelections.isPrimary, true))
    .limit(1);
  return primary?.calendarId ?? null;
}

export async function listMergedBlocks(
  window: CalendarWindow,
): Promise<CalendarBlockDto[]> {
  const rows = await db
    .select()
    .from(calendarBlocks)
    .where(
      and(
        lt(calendarBlocks.startAt, window.end),
        gt(calendarBlocks.endAt, window.start),
      ),
    );

  const byId = new Map(rows.map((row) => [row.id, row]));
  const foreign = rows.filter((row) => row.mirrored).map(toItem);
  const owned = rows
    .filter((row) => row.ownedByApp && !row.mirrored)
    .map(toItem);
  const merged = mergeCalendarItems(foreign, owned, window);

  return merged.flatMap((item) => {
    const row = byId.get(item.id);
    return row ? [toDto(row)] : [];
  });
}

export type CreateOwnedBlockInput = {
  title: string;
  startAt: Date;
  endAt: Date;
  taskId?: string | null;
  googleCalendarId?: string | null;
};

export async function createOwnedBlock(
  input: CreateOwnedBlockInput,
): Promise<CalendarBlockDto> {
  const googleCalendarId =
    input.googleCalendarId ?? (await resolvePrimaryGoogleCalendarId());

  const [row] = await db
    .insert(calendarBlocks)
    .values({
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      taskId: input.taskId ?? null,
      googleCalendarId,
      ownedByApp: true,
      mirrored: false,
      dirty: true,
    })
    .returning();

  return toDto(row);
}

export type UpdateOwnedBlockInput = {
  id: string;
  title?: string;
  startAt?: Date;
  endAt?: Date;
  taskId?: string | null;
};

export type MutateBlockResult =
  | { ok: true; block: CalendarBlockDto }
  | { ok: false; status: 404 | 403; error: string };

export async function updateOwnedBlock(
  input: UpdateOwnedBlockInput,
): Promise<MutateBlockResult> {
  const [existing] = await db
    .select()
    .from(calendarBlocks)
    .where(eq(calendarBlocks.id, input.id))
    .limit(1);

  if (!existing) {
    return { ok: false, status: 404, error: "Block not found" };
  }

  if (!agentMayModify(existing)) {
    return {
      ok: false,
      status: 403,
      error: "Foreign calendar events are read-only",
    };
  }

  const patch: Partial<CalendarBlockRow> = { dirty: true };
  if (input.title !== undefined) patch.title = input.title;
  if (input.startAt !== undefined) patch.startAt = input.startAt;
  if (input.endAt !== undefined) patch.endAt = input.endAt;
  if (input.taskId !== undefined) patch.taskId = input.taskId;

  const [row] = await db
    .update(calendarBlocks)
    .set(patch)
    .where(eq(calendarBlocks.id, input.id))
    .returning();

  return { ok: true, block: toDto(row) };
}

export type DeleteBlockResult =
  | { ok: true }
  | { ok: false; status: 404 | 403; error: string };

export async function deleteOwnedBlock(id: string): Promise<DeleteBlockResult> {
  const [existing] = await db
    .select()
    .from(calendarBlocks)
    .where(eq(calendarBlocks.id, id))
    .limit(1);

  if (!existing) {
    return { ok: false, status: 404, error: "Block not found" };
  }

  if (!agentMayModify(existing)) {
    return {
      ok: false,
      status: 403,
      error: "Foreign calendar events cannot be deleted",
    };
  }

  await db.delete(calendarBlocks).where(eq(calendarBlocks.id, id));
  return { ok: true };
}
