import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { goals } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(goals).orderBy(asc(goals.title));
  return NextResponse.json({ goals: rows });
}
