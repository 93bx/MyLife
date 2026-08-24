import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(tasks).orderBy(desc(tasks.deadline));
  return NextResponse.json({ tasks: rows });
}
