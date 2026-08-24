import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";

export async function GET() {
  let [row] = await db.select().from(settings).limit(1);
  if (!row) {
    const [created] = await db.insert(settings).values({}).returning();
    row = created;
  }
  return NextResponse.json({ settings: row });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    splitBank?: boolean;
    agentMuted?: boolean;
  };

  let [existing] = await db.select().from(settings).limit(1);
  if (!existing) {
    const [created] = await db.insert(settings).values({}).returning();
    existing = created;
  }

  const patch: { splitBank?: boolean; agentMuted?: boolean } = {};
  if (typeof body.splitBank === "boolean") patch.splitBank = body.splitBank;
  if (typeof body.agentMuted === "boolean") patch.agentMuted = body.agentMuted;

  const [row] = await db
    .update(settings)
    .set(patch)
    .where(eq(settings.id, existing.id))
    .returning();

  return NextResponse.json({ settings: row });
}
