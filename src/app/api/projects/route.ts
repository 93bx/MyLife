import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { projects } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(projects).orderBy(asc(projects.title));
  return NextResponse.json({ projects: rows });
}
