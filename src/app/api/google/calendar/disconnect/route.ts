import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
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

  await db.delete(googleSyncState);
  await db.delete(googleCalendarSelections);
  await db.delete(googleAccounts);

  return NextResponse.json({ disconnected: true });
}
