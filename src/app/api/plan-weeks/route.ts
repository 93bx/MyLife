import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { planWeeks, profiles } from "@/db/schema";
import { riyadhWeekStartFriday } from "@/lib/ai/planPrompt";

export async function GET() {
  const weekStart = riyadhWeekStartFriday();
  const [row] = await db
    .select()
    .from(planWeeks)
    .where(eq(planWeeks.weekStart, weekStart))
    .limit(1);

  if (row) {
    return NextResponse.json({ planWeek: row });
  }

  const [profile] = await db.select().from(profiles).limit(1);
  return NextResponse.json({
    planWeek: {
      id: null,
      weekStart,
      nightsOn: profile?.nightsDefaultOn ?? true,
      intentText: "",
      overloadWarned: false,
    },
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    intentText?: string;
    nightsOn?: boolean;
  };

  const weekStart = riyadhWeekStartFriday();
  const [existing] = await db
    .select()
    .from(planWeeks)
    .where(eq(planWeeks.weekStart, weekStart))
    .limit(1);

  if (existing) {
    const patch: { intentText?: string; nightsOn?: boolean } = {};
    if (typeof body.intentText === "string") patch.intentText = body.intentText;
    if (typeof body.nightsOn === "boolean") patch.nightsOn = body.nightsOn;

    const [row] = await db
      .update(planWeeks)
      .set(patch)
      .where(eq(planWeeks.id, existing.id))
      .returning();

    return NextResponse.json({ planWeek: row });
  }

  const [profile] = await db.select().from(profiles).limit(1);
  const [row] = await db
    .insert(planWeeks)
    .values({
      weekStart,
      intentText: typeof body.intentText === "string" ? body.intentText : "",
      nightsOn:
        typeof body.nightsOn === "boolean"
          ? body.nightsOn
          : (profile?.nightsDefaultOn ?? true),
    })
    .returning();

  return NextResponse.json({ planWeek: row });
}
