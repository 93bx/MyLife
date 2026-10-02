import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  googleAccounts,
  googleCalendarSelections,
  googleSyncState,
} from "@/db/schema";
import { decryptToken } from "./crypto";
import { getAccessToken } from "./oauth";
import {
  pullCalendar,
  pushDirtyBlocks,
  registerChannel,
  stopChannel,
} from "./sync";

const CHANNEL_RENEW_WITHIN_MS = 24 * 60 * 60 * 1000;

export type WebhookHeaders = {
  channelId: string;
  resourceId: string;
  resourceState: string;
};

export type WebhookResult =
  | { status: "bad_request" }
  | { status: "ok"; calendarId?: string };

export async function handleCalendarWebhook(
  headers: WebhookHeaders,
): Promise<WebhookResult> {
  const channelId = headers.channelId.trim();
  const resourceId = headers.resourceId.trim();
  const resourceState = headers.resourceState.trim().toLowerCase();

  if (!channelId || !resourceId || !resourceState) {
    return { status: "bad_request" };
  }

  // Google channel verification handshake — acknowledge without pulling.
  if (resourceState === "sync") {
    return { status: "ok" };
  }

  const [state] = await db
    .select()
    .from(googleSyncState)
    .where(
      and(
        eq(googleSyncState.channelId, channelId),
        eq(googleSyncState.resourceId, resourceId),
      ),
    )
    .limit(1);

  if (!state) {
    return { status: "ok" };
  }

  const [account] = await db.select().from(googleAccounts).limit(1);
  if (!account) {
    return { status: "ok", calendarId: state.calendarId };
  }

  const accessToken = await getAccessToken(
    decryptToken(account.refreshTokenEnc),
  );

  // Acknowledge Google before pull completes (self-hosted Node; fire-and-forget).
  const calendarId = state.calendarId;
  void pullCalendar(calendarId, { accessToken }).catch((err: unknown) => {
    console.error(
      `[google webhook] pull failed for calendar ${calendarId}`,
      err,
    );
  });

  return { status: "ok", calendarId };
}

export async function renewExpiringChannels(
  withinMs = CHANNEL_RENEW_WITHIN_MS,
): Promise<number> {
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return 0;
  }

  const selected = await db
    .select()
    .from(googleCalendarSelections)
    .where(eq(googleCalendarSelections.selected, true));
  const selectedIds = new Set(selected.map((row) => row.calendarId));

  const states = await db.select().from(googleSyncState);
  const cutoff = Date.now() + withinMs;
  let renewed = 0;

  for (const state of states) {
    if (!selectedIds.has(state.calendarId)) {
      continue;
    }
    if (!state.channelExpiration) {
      continue;
    }
    if (state.channelExpiration.getTime() > cutoff) {
      continue;
    }

    await stopChannel(state.calendarId);
    await registerChannel(state.calendarId, webhookUrl);
    renewed += 1;
  }

  return renewed;
}

export type SyncRunResult = {
  connected: boolean;
  pulled: number;
  renewed: number;
};

export async function runSelectedCalendarSync(): Promise<SyncRunResult> {
  const [account] = await db.select().from(googleAccounts).limit(1);
  if (!account) {
    return { connected: false, pulled: 0, renewed: 0 };
  }

  const accessToken = await getAccessToken(
    decryptToken(account.refreshTokenEnc),
  );

  const selected = await db
    .select()
    .from(googleCalendarSelections)
    .where(eq(googleCalendarSelections.selected, true));

  let pulled = 0;
  for (const cal of selected) {
    try {
      await pullCalendar(cal.calendarId, { accessToken });
      pulled += 1;
    } catch (err: unknown) {
      console.error(
        `[google sync] pull failed for calendar ${cal.calendarId}`,
        err,
      );
    }
  }

  await pushDirtyBlocks();
  const renewed = await renewExpiringChannels();

  return {
    connected: true,
    pulled,
    renewed,
  };
}
