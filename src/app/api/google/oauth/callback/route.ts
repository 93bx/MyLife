import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { googleAccounts } from "@/db/schema";
import { syncCalendarSelectionsFromGoogle } from "@/lib/google/calendarSelections";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google/constants";
import { encryptToken } from "@/lib/google/crypto";
import { exchangeCode, getAccessToken } from "@/lib/google/oauth";

function settingsRedirect(request: Request, params: Record<string, string>) {
  const url = new URL("/settings", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (oauthError) {
    return settingsRedirect(request, { google: "error", reason: oauthError });
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return settingsRedirect(request, { google: "error", reason: "state" });
  }

  try {
    const { refreshToken, email } = await exchangeCode(code);
    const refreshTokenEnc = encryptToken(refreshToken);

    const [existing] = await db.select().from(googleAccounts).limit(1);
    if (existing) {
      await db
        .update(googleAccounts)
        .set({
          email,
          refreshTokenEnc,
          connectedAt: new Date(),
        })
        .where(eq(googleAccounts.id, existing.id));
    } else {
      await db.insert(googleAccounts).values({
        email,
        refreshTokenEnc,
      });
    }

    const accessToken = await getAccessToken(refreshToken);
    await syncCalendarSelectionsFromGoogle(accessToken);

    return settingsRedirect(request, { google: "connected" });
  } catch (err) {
    const reason =
      err instanceof Error && err.message.includes("refresh token")
        ? "no_refresh_token"
        : "exchange";
    return settingsRedirect(request, { google: "error", reason });
  }
}
