import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  calendarBlocks,
  googleAccounts,
  googleCalendarSelections,
  googleSyncState,
} from "@/db/schema";
import { stopChannel } from "@/lib/google/sync";

export async function POST() {
  const syncRows = await db.select().from(googleSyncState);
  for (const row of syncRows) {
    await stopChannel(row.calendarId);
  }

  // Drop mirrored Google cache; unlink owned local blocks so deletes work offline.
  await db.delete(calendarBlocks).where(eq(calendarBlocks.mirrored, true));
  await db
    .update(calendarBlocks)
    .set({
      googleEventId: null,
      googleCalendarId: null,
      dirty: true,
    })
    .where(eq(calendarBlocks.mirrored, false));

  await db.delete(googleSyncState);
  await db.delete(googleCalendarSelections);
  await db.delete(googleAccounts);

  return NextResponse.json({ disconnected: true });
}
