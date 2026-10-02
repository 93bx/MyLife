import { NextResponse } from "next/server";
import { handleCalendarWebhook } from "@/lib/google/triggerSync";

export async function POST(request: Request) {
  const result = await handleCalendarWebhook({
    channelId: request.headers.get("X-Goog-Channel-ID") ?? "",
    resourceId: request.headers.get("X-Goog-Resource-ID") ?? "",
    resourceState: request.headers.get("X-Goog-Resource-State") ?? "",
  });

  if (result.status === "bad_request") {
    return NextResponse.json({ error: "invalid webhook headers" }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
