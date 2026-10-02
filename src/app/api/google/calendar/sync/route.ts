import { NextResponse } from "next/server";
import { runSelectedCalendarSync } from "@/lib/google/triggerSync";

export async function POST() {
  const result = await runSelectedCalendarSync();
  return NextResponse.json(result);
}
