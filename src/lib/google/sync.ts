import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { calendar_v3 } from "googleapis";
import { db } from "@/db/client";
import {
  calendarBlocks,
  googleAccounts,
  googleSyncState,
} from "@/db/schema";
import {
  createCalendarClient,
  insertEvent,
  listEvents,
  patchEvent,
  stopChannel as stopGoogleChannel,
  watchCalendar,
} from "./calendarClient";
import {
  MYLIFE_OWNED_PROP_KEY,
  MYLIFE_OWNED_PROP_VALUE,
  SYNC_WINDOW_FUTURE_DAYS,
  SYNC_WINDOW_PAST_DAYS,
} from "./constants";
import { decryptToken } from "./crypto";
import { getAccessToken } from "./oauth";

export type OwnedEventInput = {
  title: string;
  start: string;
  end: string;
};

export function ownedEventPayload(block: OwnedEventInput): calendar_v3.Schema$Event {
  return {
    summary: block.title,
    start: { dateTime: block.start },
    end: { dateTime: block.end },
    extendedProperties: {
      private: {
        [MYLIFE_OWNED_PROP_KEY]: MYLIFE_OWNED_PROP_VALUE,
      },
    },
  };
}

export type PullCalendarOpts = {
  accessToken: string;
};

function isOwnedGoogleEvent(event: calendar_v3.Schema$Event): boolean {
  return (
    event.extendedProperties?.private?.[MYLIFE_OWNED_PROP_KEY] ===
    MYLIFE_OWNED_PROP_VALUE
  );
}

function eventStartEnd(event: calendar_v3.Schema$Event): {
  start: Date;
  end: Date;
} | null {
  const startStr = event.start?.dateTime ?? event.start?.date;
  const endStr = event.end?.dateTime ?? event.end?.date;
  if (!startStr || !endStr) {
    return null;
  }
  return { start: new Date(startStr), end: new Date(endStr) };
}

function syncWindowIso(): { timeMin: string; timeMax: string } {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setUTCDate(timeMin.getUTCDate() - SYNC_WINDOW_PAST_DAYS);
  const timeMax = new Date(now);
  timeMax.setUTCDate(timeMax.getUTCDate() + SYNC_WINDOW_FUTURE_DAYS);
  return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() };
}

function isSyncTokenGone(err: unknown): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const e = err as { code?: number; response?: { status?: number } };
  return e.code === 410 || e.response?.status === 410;
}

async function getSyncState(calendarId: string) {
  const [row] = await db
    .select()
    .from(googleSyncState)
    .where(eq(googleSyncState.calendarId, calendarId))
    .limit(1);
  return row;
}

async function saveSyncToken(calendarId: string, syncToken: string) {
  const existing = await getSyncState(calendarId);
  if (existing) {
    await db
      .update(googleSyncState)
      .set({ syncToken })
      .where(eq(googleSyncState.calendarId, calendarId));
    return;
  }
  await db.insert(googleSyncState).values({ calendarId, syncToken });
}

async function clearSyncToken(calendarId: string) {
  const existing = await getSyncState(calendarId);
  if (!existing) {
    return;
  }
  await db
    .update(googleSyncState)
    .set({ syncToken: null })
    .where(eq(googleSyncState.calendarId, calendarId));
}

async function deleteMirroredEvent(calendarId: string, eventId: string) {
  await db
    .delete(calendarBlocks)
    .where(
      and(
        eq(calendarBlocks.googleEventId, eventId),
        eq(calendarBlocks.googleCalendarId, calendarId),
        eq(calendarBlocks.mirrored, true),
      ),
    );
}

async function upsertMirroredEvent(
  calendarId: string,
  event: calendar_v3.Schema$Event,
) {
  if (!event.id) {
    return;
  }
  const times = eventStartEnd(event);
  if (!times) {
    return;
  }

  const summary = event.summary ?? "(No title)";

  const [existing] = await db
    .select()
    .from(calendarBlocks)
    .where(
      and(
        eq(calendarBlocks.googleEventId, event.id),
        eq(calendarBlocks.googleCalendarId, calendarId),
        eq(calendarBlocks.mirrored, true),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(calendarBlocks)
      .set({
        title: summary,
        startAt: times.start,
        endAt: times.end,
        foreignSummary: summary,
        foreignStartAt: times.start,
        foreignEndAt: times.end,
      })
      .where(eq(calendarBlocks.id, existing.id));
    return;
  }

  await db.insert(calendarBlocks).values({
    title: summary,
    startAt: times.start,
    endAt: times.end,
    googleEventId: event.id,
    googleCalendarId: calendarId,
    ownedByApp: false,
    mirrored: true,
    dirty: false,
    foreignSummary: summary,
    foreignStartAt: times.start,
    foreignEndAt: times.end,
  });
}

async function updateOwnedBlockFromGoogle(
  calendarId: string,
  event: calendar_v3.Schema$Event,
) {
  if (!event.id) {
    return;
  }
  const times = eventStartEnd(event);
  if (!times) {
    return;
  }

  const [owned] = await db
    .select()
    .from(calendarBlocks)
    .where(
      and(
        eq(calendarBlocks.googleEventId, event.id),
        eq(calendarBlocks.googleCalendarId, calendarId),
        eq(calendarBlocks.mirrored, false),
      ),
    )
    .limit(1);

  if (!owned) {
    return;
  }

  await db
    .update(calendarBlocks)
    .set({
      title: event.summary ?? owned.title,
      startAt: times.start,
      endAt: times.end,
    })
    .where(eq(calendarBlocks.id, owned.id));
}

async function processPulledEvents(
  calendarId: string,
  events: calendar_v3.Schema$Event[],
) {
  for (const event of events) {
    if (!event.id) {
      continue;
    }

    if (event.status === "cancelled") {
      await deleteMirroredEvent(calendarId, event.id);
      continue;
    }

    if (isOwnedGoogleEvent(event)) {
      await updateOwnedBlockFromGoogle(calendarId, event);
      continue;
    }

    await upsertMirroredEvent(calendarId, event);
  }
}

async function fetchAllEvents(
  client: calendar_v3.Calendar,
  calendarId: string,
  syncToken: string | null | undefined,
): Promise<string | null | undefined> {
  let pageToken: string | undefined;
  let nextSyncToken: string | null | undefined;
  const timeWindow = syncToken ? undefined : syncWindowIso();
  let firstPage = true;

  do {
    const result = await listEvents(client, calendarId, {
      syncToken: firstPage ? (syncToken ?? undefined) : undefined,
      timeMin: firstPage && !syncToken ? timeWindow?.timeMin : undefined,
      timeMax: firstPage && !syncToken ? timeWindow?.timeMax : undefined,
      pageToken,
    });

    await processPulledEvents(calendarId, result.events);

    pageToken = result.nextPageToken ?? undefined;
    firstPage = false;
    if (result.nextSyncToken) {
      nextSyncToken = result.nextSyncToken;
    }
  } while (pageToken);

  return nextSyncToken;
}

export async function pullCalendar(
  calendarId: string,
  opts: PullCalendarOpts,
): Promise<void> {
  const client = createCalendarClient(opts.accessToken);
  const state = await getSyncState(calendarId);
  const syncToken = state?.syncToken;

  try {
    const nextToken = await fetchAllEvents(client, calendarId, syncToken);
    if (nextToken) {
      await saveSyncToken(calendarId, nextToken);
    }
  } catch (err) {
    if (isSyncTokenGone(err) && syncToken) {
      await clearSyncToken(calendarId);
      const nextToken = await fetchAllEvents(client, calendarId, null);
      if (nextToken) {
        await saveSyncToken(calendarId, nextToken);
      }
      return;
    }
    throw err;
  }
}

export async function pushDirtyBlocks(): Promise<void> {
  const [account] = await db.select().from(googleAccounts).limit(1);
  if (!account) {
    return;
  }

  const accessToken = await getAccessToken(decryptToken(account.refreshTokenEnc));
  const client = createCalendarClient(accessToken);

  const dirtyBlocks = await db
    .select()
    .from(calendarBlocks)
    .where(
      and(
        eq(calendarBlocks.dirty, true),
        eq(calendarBlocks.ownedByApp, true),
        eq(calendarBlocks.mirrored, false),
      ),
    );

  for (const block of dirtyBlocks) {
    if (!block.googleCalendarId) {
      continue;
    }

    const payload = ownedEventPayload({
      title: block.title,
      start: block.startAt.toISOString(),
      end: block.endAt.toISOString(),
    });

    if (block.googleEventId) {
      await patchEvent(
        client,
        block.googleCalendarId,
        block.googleEventId,
        payload,
      );
    } else {
      const created = await insertEvent(client, block.googleCalendarId, payload);
      if (created.id) {
        await db
          .update(calendarBlocks)
          .set({ googleEventId: created.id, dirty: false })
          .where(eq(calendarBlocks.id, block.id));
        continue;
      }
    }

    await db
      .update(calendarBlocks)
      .set({ dirty: false })
      .where(eq(calendarBlocks.id, block.id));
  }
}

export async function registerChannel(
  calendarId: string,
  webhookUrl: string,
): Promise<void> {
  const [account] = await db.select().from(googleAccounts).limit(1);
  if (!account) {
    throw new Error("No Google account connected");
  }

  const accessToken = await getAccessToken(decryptToken(account.refreshTokenEnc));
  const client = createCalendarClient(accessToken);
  const channelId = randomUUID();

  const watch = await watchCalendar(client, calendarId, {
    id: channelId,
    type: "web_hook",
    address: webhookUrl,
  });

  const expiration = watch.expiration
    ? new Date(Number(watch.expiration))
    : null;

  const existing = await getSyncState(calendarId);
  const channelPatch = {
    channelId: watch.id ?? channelId,
    resourceId: watch.resourceId ?? null,
    channelExpiration: expiration,
  };

  if (existing) {
    await db
      .update(googleSyncState)
      .set(channelPatch)
      .where(eq(googleSyncState.calendarId, calendarId));
    return;
  }

  await db.insert(googleSyncState).values({
    calendarId,
    ...channelPatch,
  });
}

export async function stopChannel(calendarId: string): Promise<void> {
  const state = await getSyncState(calendarId);
  if (!state?.channelId || !state.resourceId) {
    return;
  }

  const [account] = await db.select().from(googleAccounts).limit(1);
  if (account) {
    const accessToken = await getAccessToken(
      decryptToken(account.refreshTokenEnc),
    );
    const client = createCalendarClient(accessToken);
    try {
      await stopGoogleChannel(client, {
        id: state.channelId,
        resourceId: state.resourceId,
      });
    } catch {
      // Channel may already be expired or stopped.
    }
  }

  await db
    .update(googleSyncState)
    .set({
      channelId: null,
      resourceId: null,
      channelExpiration: null,
    })
    .where(eq(googleSyncState.calendarId, calendarId));
}
