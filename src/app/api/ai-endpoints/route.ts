import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiEndpoints } from "@/db/schema";
import {
  isAbsoluteHttpUrl,
  parseAiEndpointKind,
  validateEndpointCreate,
} from "@/lib/ai/endpointValidation";

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

  const parsed = validateEndpointCreate(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [endpoint] = await db
    .insert(aiEndpoints)
    .values(parsed.value)
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

  const [existing] = await db
    .select()
    .from(aiEndpoints)
    .where(eq(aiEndpoints.id, body.id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "endpoint not found" }, { status: 404 });
  }

  const nextKind =
    body.kind !== undefined
      ? parseAiEndpointKind(body.kind)
      : parseAiEndpointKind(existing.kind);
  if (body.kind !== undefined && !nextKind) {
    return NextResponse.json(
      { error: "kind must be provider, aggregator, or local" },
      { status: 400 },
    );
  }
  if (body.baseUrl !== undefined && !isAbsoluteHttpUrl(String(body.baseUrl))) {
    return NextResponse.json(
      { error: "baseUrl must be an absolute http(s) URL" },
      { status: 400 },
    );
  }
  const nextKey =
    body.apiKey !== undefined ? String(body.apiKey) : existing.apiKey;
  const kindForKey = nextKind ?? "provider";
  if (kindForKey !== "local" && !nextKey.trim()) {
    return NextResponse.json(
      { error: "apiKey is required for provider and aggregator" },
      { status: 400 },
    );
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
