import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const [profile] = await db.select().from(profiles).limit(1);
  if (!profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const [existing] = await db.select().from(profiles).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  const allowed = [
    "fullName",
    "summary",
    "workStart",
    "workEnd",
    "timezone",
    "salarySar",
    "rentShareYearlySar",
    "billsShareMinSar",
    "billsShareMaxSar",
    "iqamaYearlySar",
    "cashBufferSar",
    "geoSequence",
    "nightsDefaultOn",
    "smsFirstDefault",
    "weekend",
    "github",
    "noticeDays",
    "allowTrainOnFreeNonMoney",
    "payoutMethods",
  ] as const;

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const [profile] = await db
    .update(profiles)
    .set(patch)
    .where(eq(profiles.id, existing.id))
    .returning();

  return NextResponse.json({ profile });
}
