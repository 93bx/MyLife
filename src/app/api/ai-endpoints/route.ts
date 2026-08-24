import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiEndpoints } from "@/db/schema";

export async function GET() {
  const endpoints = await db
    .select()
    .from(aiEndpoints)
    .orderBy(asc(aiEndpoints.sortOrder));
  return NextResponse.json({ endpoints });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    name?: string;
    baseUrl?: string;
    apiKey?: string;
    model?: string | null;
    trainsOnPrompts?: boolean;
    enabled?: boolean;
    sortOrder?: number;
  };

  if (!body.kind || !body.name || !body.baseUrl || !body.apiKey) {
    return NextResponse.json(
      { error: "kind, name, baseUrl, and apiKey are required" },
      { status: 400 },
    );
  }

  const [endpoint] = await db
    .insert(aiEndpoints)
    .values({
      kind: body.kind,
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      model: body.model ?? null,
      trainsOnPrompts: body.trainsOnPrompts ?? false,
      enabled: body.enabled ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ endpoint }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    kind?: string;
    name?: string;
    baseUrl?: string;
    apiKey?: string;
    model?: string | null;
    trainsOnPrompts?: boolean;
    enabled?: boolean;
    sortOrder?: number;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const key of [
    "kind",
    "name",
    "baseUrl",
    "apiKey",
    "model",
    "trainsOnPrompts",
    "enabled",
    "sortOrder",
  ] as const) {
    if (key in body && body[key] !== undefined) patch[key] = body[key];
  }

  const [endpoint] = await db
    .update(aiEndpoints)
    .set(patch)
    .where(eq(aiEndpoints.id, body.id))
    .returning();

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint not found" }, { status: 404 });
  }

  return NextResponse.json({ endpoint });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [endpoint] = await db
    .delete(aiEndpoints)
    .where(eq(aiEndpoints.id, body.id))
    .returning();

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
