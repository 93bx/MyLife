import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { googleAccounts } from "@/db/schema";
import {
  applyCalendarSelectionPatch,
  isPushUnavailable,
  listCalendarSelectionRows,
} from "@/lib/google/calendarSelections";

export async function GET() {
  const [account] = await db.select().from(googleAccounts).limit(1);
  const calendars = account ? await listCalendarSelectionRows() : [];

  return NextResponse.json({
    connected: !!account,
    email: account?.email ?? null,
    pushUnavailable: isPushUnavailable(),
    calendars: calendars.map((cal) => ({
      id: cal.id,
      calendarId: cal.calendarId,
      summary: cal.summary,
      isPrimary: cal.isPrimary,
      selected: cal.selected,
    })),
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    calendarId?: string;
    selected?: boolean;
  };

  if (typeof body.calendarId !== "string" || typeof body.selected !== "boolean") {
    return NextResponse.json(
      { error: "calendarId and selected are required" },
      { status: 400 },
    );
  }

  const [account] = await db.select().from(googleAccounts).limit(1);
  if (!account) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  const result = await applyCalendarSelectionPatch(
    body.calendarId,
    body.selected,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const calendars = await listCalendarSelectionRows();
  return NextResponse.json({
    calendars: calendars.map((cal) => ({
      id: cal.id,
      calendarId: cal.calendarId,
      summary: cal.summary,
      isPrimary: cal.isPrimary,
      selected: cal.selected,
    })),
  });
}
