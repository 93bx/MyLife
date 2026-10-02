import { NextResponse } from "next/server";
import {
  createOwnedBlock,
  deleteOwnedBlock,
  listMergedBlocks,
  updateOwnedBlock,
} from "@/lib/calendar/blocks";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function defaultWindow(): { start: Date; end: Date } {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");

  let start: Date;
  let end: Date;
  if (startParam || endParam) {
    const parsedStart = parseDate(startParam);
    const parsedEnd = parseDate(endParam);
    if (!parsedStart || !parsedEnd) {
      return NextResponse.json(
        { error: "start and end must be valid ISO datetimes" },
        { status: 400 },
      );
    }
    if (parsedStart >= parsedEnd) {
      return NextResponse.json(
        { error: "start must be before end" },
        { status: 400 },
      );
    }
    start = parsedStart;
    end = parsedEnd;
  } else {
    ({ start, end } = defaultWindow());
  }

  const blocks = await listMergedBlocks({ start, end });
  return NextResponse.json({ blocks, start: start.toISOString(), end: end.toISOString() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    startAt?: string;
    endAt?: string;
    taskId?: string | null;
    googleCalendarId?: string | null;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const startAt = parseDate(body.startAt);
  const endAt = parseDate(body.endAt);
  if (!startAt || !endAt) {
    return NextResponse.json(
      { error: "startAt and endAt must be valid ISO datetimes" },
      { status: 400 },
    );
  }
  if (startAt >= endAt) {
    return NextResponse.json(
      { error: "startAt must be before endAt" },
      { status: 400 },
    );
  }

  const block = await createOwnedBlock({
    title: body.title.trim(),
    startAt,
    endAt,
    taskId: body.taskId ?? null,
    googleCalendarId: body.googleCalendarId ?? null,
  });

  return NextResponse.json({ block }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    startAt?: string;
    endAt?: string;
    taskId?: string | null;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let startAt: Date | undefined;
  let endAt: Date | undefined;
  if (body.startAt !== undefined) {
    const parsed = parseDate(body.startAt);
    if (!parsed) {
      return NextResponse.json(
        { error: "startAt must be a valid ISO datetime" },
        { status: 400 },
      );
    }
    startAt = parsed;
  }
  if (body.endAt !== undefined) {
    const parsed = parseDate(body.endAt);
    if (!parsed) {
      return NextResponse.json(
        { error: "endAt must be a valid ISO datetime" },
        { status: 400 },
      );
    }
    endAt = parsed;
  }

  if (
    body.title === undefined &&
    startAt === undefined &&
    endAt === undefined &&
    body.taskId === undefined
  ) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );
  }

  const result = await updateOwnedBlock({
    id: body.id,
    title: body.title?.trim(),
    startAt,
    endAt,
    taskId: body.taskId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ block: result.block });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const result = await deleteOwnedBlock(body.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
