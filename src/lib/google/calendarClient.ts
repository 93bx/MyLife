import { google, type calendar_v3 } from "googleapis";

export function createCalendarClient(accessToken: string): calendar_v3.Calendar {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

export type ListEventsParams = {
  syncToken?: string;
  timeMin?: string;
  timeMax?: string;
  pageToken?: string;
};

export type ListEventsResult = {
  events: calendar_v3.Schema$Event[];
  nextSyncToken?: string | null;
  nextPageToken?: string | null;
};

export async function listEvents(
  client: calendar_v3.Calendar,
  calendarId: string,
  params: ListEventsParams,
): Promise<ListEventsResult> {
  const res = await client.events.list({
    calendarId,
    syncToken: params.syncToken,
    timeMin: params.syncToken ? undefined : params.timeMin,
    timeMax: params.syncToken ? undefined : params.timeMax,
    singleEvents: true,
    showDeleted: !!params.syncToken,
    pageToken: params.pageToken,
    maxResults: 250,
  });

  return {
    events: res.data.items ?? [],
    nextSyncToken: res.data.nextSyncToken,
    nextPageToken: res.data.nextPageToken,
  };
}

export async function insertEvent(
  client: calendar_v3.Calendar,
  calendarId: string,
  body: calendar_v3.Schema$Event,
): Promise<calendar_v3.Schema$Event> {
  const res = await client.events.insert({
    calendarId,
    requestBody: body,
  });
  return res.data;
}

export async function patchEvent(
  client: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  body: calendar_v3.Schema$Event,
): Promise<calendar_v3.Schema$Event> {
  const res = await client.events.patch({
    calendarId,
    eventId,
    requestBody: body,
  });
  return res.data;
}

export async function watchCalendar(
  client: calendar_v3.Calendar,
  calendarId: string,
  body: calendar_v3.Schema$Channel,
): Promise<calendar_v3.Schema$Channel> {
  const res = await client.events.watch({
    calendarId,
    requestBody: body,
  });
  return res.data;
}

export async function stopChannel(
  client: calendar_v3.Calendar,
  body: calendar_v3.Schema$Channel,
): Promise<void> {
  await client.channels.stop({ requestBody: body });
}
