import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recurrenceTemplates } from "@/db/schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    enabled?: unknown;
  };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled boolean required" }, { status: 400 });
  }
  const [row] = await db
    .select()
    .from(recurrenceTemplates)
    .where(eq(recurrenceTemplates.id, id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "template not found" }, { status: 404 });
  }
  const [updated] = await db
    .update(recurrenceTemplates)
    .set({ enabled: body.enabled })
    .where(eq(recurrenceTemplates.id, id))
    .returning();
  return NextResponse.json({ template: updated });
}
