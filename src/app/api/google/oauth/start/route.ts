import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google/constants";
import { buildAuthUrl } from "@/lib/google/oauth";

export async function GET(request: Request) {
  try {
    const state = randomBytes(32).toString("hex");
    const res = NextResponse.redirect(buildAuthUrl(state));
    res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
    });
    return res;
  } catch {
    return NextResponse.redirect(
      new URL("/settings?google=error&reason=config", request.url),
    );
  }
}
