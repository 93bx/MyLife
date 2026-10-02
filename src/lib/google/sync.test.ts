import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  dbInsert: vi.fn(),
  dbUpdate: vi.fn(),
  dbDelete: vi.fn(),
  listEvents: vi.fn(),
  insertEvent: vi.fn(),
  patchEvent: vi.fn(),
  createCalendarClient: vi.fn(() => ({})),
  getAccessToken: vi.fn(async () => "access-token"),
  decryptToken: vi.fn(() => "refresh-token"),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mocks.dbSelect,
    insert: mocks.dbInsert,
    update: mocks.dbUpdate,
    delete: mocks.dbDelete,
  },
}));

vi.mock("./calendarClient", () => ({
  createCalendarClient: mocks.createCalendarClient,
  listEvents: mocks.listEvents,
  insertEvent: mocks.insertEvent,
  patchEvent: mocks.patchEvent,
  watchCalendar: vi.fn(),
  stopChannel: vi.fn(),
}));
vi.mock("@/lib/google/calendarClient", () => ({
  createCalendarClient: mocks.createCalendarClient,
  listEvents: mocks.listEvents,
  insertEvent: mocks.insertEvent,
  patchEvent: mocks.patchEvent,
  watchCalendar: vi.fn(),
  stopChannel: vi.fn(),
}));

vi.mock("./oauth", () => ({
  getAccessToken: mocks.getAccessToken,
}));
vi.mock("@/lib/google/oauth", () => ({
  getAccessToken: mocks.getAccessToken,
}));

vi.mock("./crypto", () => ({
  decryptToken: mocks.decryptToken,
}));
vi.mock("@/lib/google/crypto", () => ({
  decryptToken: mocks.decryptToken,
}));

import { ownedEventPayload, pullCalendar, pushDirtyBlocks, syncWindowIso } from "./sync";
import {
  SYNC_WINDOW_FUTURE_DAYS,
  SYNC_WINDOW_PAST_DAYS,
} from "./constants";
import { riyadhToday } from "@/domain/cashPing";

function selectChain(rows: unknown[]) {
  const chain: {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    then: (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  } = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(rows).then(onFulfilled, onRejected),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValue(rows);
  return chain;
}

function deleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function updateChain() {
  const chain: {
    set: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    _set?: unknown;
  } = {
    set: vi.fn(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  chain.set.mockImplementation((value: unknown) => {
    chain._set = value;
    return chain;
  });
  return chain;
}

function insertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ownedEventPayload", () => {
  it("sets private extended property", () => {
    expect(
      ownedEventPayload({
        title: "Study",
        start: "2026-09-01T10:00:00Z",
        end: "2026-09-01T11:00:00Z",
      }),
    ).toMatchObject({
      extendedProperties: { private: { ownedByApp: "1" } },
    });
  });
});

describe("syncWindowIso", () => {
  it("bounds past/future days to Asia/Riyadh calendar dates", () => {
    // 2026-09-01 22:00 UTC = 2026-09-02 01:00 Riyadh — UTC day differs from Riyadh day.
    const asOf = new Date("2026-09-01T22:00:00.000Z");
    const { timeMin, timeMax } = syncWindowIso(asOf);
    const today = riyadhToday(asOf);
    expect(today).toBe("2026-09-02");

    const minDay = new Date(timeMin);
    const maxDay = new Date(timeMax);
    expect(riyadhToday(minDay)).toBe(
      riyadhToday(
        new Date(
          new Date(`${today}T12:00:00+03:00`).getTime() -
            SYNC_WINDOW_PAST_DAYS * 24 * 60 * 60 * 1000,
        ),
      ),
    );
    expect(riyadhToday(maxDay)).toBe(
      riyadhToday(
        new Date(
          new Date(`${today}T12:00:00+03:00`).getTime() +
            SYNC_WINDOW_FUTURE_DAYS * 24 * 60 * 60 * 1000,
        ),
      ),
    );
    expect(timeMin).toBe("2026-08-25T21:00:00.000Z"); // 2026-08-26 00:00+03
    expect(timeMax).toBe("2026-09-30T20:59:59.999Z"); // 2026-09-30 23:59:59.999+03
  });
});

describe("pullCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCalendarClient.mockReturnValue({});
  });

  it("clears mirrored rows before full sync after 410", async () => {
    const syncState = {
      calendarId: "cal-1",
      syncToken: "stale-token",
    };

    mocks.dbSelect
      .mockReturnValueOnce(selectChain([syncState]))
      .mockReturnValue(selectChain([]));

    const mirroredDelete = deleteChain();
    mocks.dbDelete.mockReturnValue(mirroredDelete);

    mocks.listEvents
      .mockRejectedValueOnce({ code: 410 })
      .mockResolvedValueOnce({
        events: [
          {
            id: "foreign-1",
            status: "confirmed",
            summary: "Meeting",
            start: { dateTime: "2026-09-01T10:00:00Z" },
            end: { dateTime: "2026-09-01T11:00:00Z" },
          },
        ],
        nextSyncToken: "new-token",
      });

    mocks.dbUpdate.mockReturnValue(updateChain());
    mocks.dbInsert.mockReturnValue(insertChain());

    await pullCalendar("cal-1", { accessToken: "tok" });

    expect(mocks.listEvents).toHaveBeenCalledTimes(2);
    expect(mocks.dbDelete).toHaveBeenCalled();
    expect(mirroredDelete.where).toHaveBeenCalled();
    expect(mocks.dbInsert).toHaveBeenCalled();
  });

  it("does not overwrite dirty owned blocks from Google", async () => {
    mocks.dbSelect
      .mockReturnValueOnce(selectChain([]))
      .mockReturnValueOnce(
        selectChain([
          {
            id: "block-1",
            title: "Local draft",
            dirty: true,
            startAt: new Date("2026-09-01T09:00:00Z"),
            endAt: new Date("2026-09-01T10:00:00Z"),
          },
        ]),
      )
      .mockReturnValue(selectChain([]));

    mocks.dbDelete.mockReturnValue(deleteChain());

    mocks.listEvents.mockResolvedValueOnce({
      events: [
        {
          id: "evt-owned",
          status: "confirmed",
          summary: "Google title",
          start: { dateTime: "2026-09-01T12:00:00Z" },
          end: { dateTime: "2026-09-01T13:00:00Z" },
          extendedProperties: { private: { ownedByApp: "1" } },
        },
      ],
      nextSyncToken: "tok-1",
    });

    const updates: ReturnType<typeof updateChain>[] = [];
    mocks.dbUpdate.mockImplementation(() => {
      const chain = updateChain();
      updates.push(chain);
      return chain;
    });
    mocks.dbInsert.mockReturnValue(insertChain());

    await pullCalendar("cal-1", { accessToken: "tok" });

    const setCalls = updates.flatMap((u) =>
      u.set.mock.calls.map((c) => c[0] as object),
    );
    expect(setCalls.some((s) => "title" in s || "startAt" in s)).toBe(false);
  });

  it("clears googleEventId and marks dirty when owned event is cancelled", async () => {
    mocks.dbSelect.mockReturnValue(selectChain([]));
    mocks.dbDelete.mockReturnValue(deleteChain());

    mocks.listEvents.mockResolvedValueOnce({
      events: [
        {
          id: "evt-gone",
          status: "cancelled",
        },
      ],
      nextSyncToken: "tok-1",
    });

    const unlinkUpdate = updateChain();
    mocks.dbUpdate.mockReturnValue(unlinkUpdate);
    mocks.dbInsert.mockReturnValue(insertChain());

    await pullCalendar("cal-1", { accessToken: "tok" });

    expect(unlinkUpdate.set).toHaveBeenCalledWith({
      googleEventId: null,
      dirty: true,
    });
  });
});

describe("pushDirtyBlocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCalendarClient.mockReturnValue({});
    mocks.decryptToken.mockReturnValue("refresh-token");
    mocks.getAccessToken.mockResolvedValue("access-token");
  });

  it("on patch 404 clears googleEventId and re-inserts owned event", async () => {
    const blocks = [
      {
        id: "b1",
        title: "A",
        startAt: new Date("2026-09-01T10:00:00Z"),
        endAt: new Date("2026-09-01T11:00:00Z"),
        googleCalendarId: "cal-1",
        googleEventId: "dead-id",
        dirty: true,
        ownedByApp: true,
        mirrored: false,
      },
    ];

    mocks.dbSelect
      .mockReturnValueOnce(selectChain([{ refreshTokenEnc: "enc" }]))
      .mockReturnValueOnce(selectChain([{ calendarId: "cal-1" }]))
      .mockReturnValueOnce(selectChain(blocks));

    mocks.patchEvent.mockRejectedValueOnce({ code: 404 });
    mocks.insertEvent.mockResolvedValueOnce({ id: "fresh-id" });

    const updates: ReturnType<typeof updateChain>[] = [];
    mocks.dbUpdate.mockImplementation(() => {
      const chain = updateChain();
      updates.push(chain);
      return chain;
    });

    await pushDirtyBlocks();

    expect(mocks.patchEvent).toHaveBeenCalledTimes(1);
    expect(mocks.insertEvent).toHaveBeenCalledTimes(1);
    expect(mocks.insertEvent.mock.calls[0]?.[2]).toMatchObject({
      summary: "A",
      extendedProperties: { private: { ownedByApp: "1" } },
    });

    const setPayloads = updates.map((u) => u._set);
    expect(setPayloads).toEqual([
      { googleEventId: null },
      { googleEventId: "fresh-id", googleCalendarId: "cal-1", dirty: false },
    ]);
  });

  it("resolves primary calendar id when dirty block has null googleCalendarId", async () => {
    const blocks = [
      {
        id: "b1",
        title: "A",
        startAt: new Date("2026-09-01T10:00:00Z"),
        endAt: new Date("2026-09-01T11:00:00Z"),
        googleCalendarId: null,
        googleEventId: null,
        dirty: true,
        ownedByApp: true,
        mirrored: false,
      },
    ];

    mocks.dbSelect
      .mockReturnValueOnce(selectChain([{ refreshTokenEnc: "enc" }]))
      .mockReturnValueOnce(selectChain([{ calendarId: "primary-cal" }]))
      .mockReturnValueOnce(selectChain(blocks));

    mocks.insertEvent.mockResolvedValueOnce({ id: "fresh-id" });

    const updates: ReturnType<typeof updateChain>[] = [];
    mocks.dbUpdate.mockImplementation(() => {
      const chain = updateChain();
      updates.push(chain);
      return chain;
    });

    await pushDirtyBlocks();

    expect(mocks.insertEvent).toHaveBeenCalledWith(
      {},
      "primary-cal",
      expect.objectContaining({ summary: "A" }),
    );
    expect(updates.map((u) => u._set)).toEqual([
      {
        googleEventId: "fresh-id",
        googleCalendarId: "primary-cal",
        dirty: false,
      },
    ]);
  });

  it("continues queue when one non-404 patch throws and skips dirty=false on insert without id", async () => {
    const blocks = [
      {
        id: "b1",
        title: "A",
        startAt: new Date("2026-09-01T10:00:00Z"),
        endAt: new Date("2026-09-01T11:00:00Z"),
        googleCalendarId: "cal-1",
        googleEventId: "dead-id",
        dirty: true,
        ownedByApp: true,
        mirrored: false,
      },
      {
        id: "b2",
        title: "B",
        startAt: new Date("2026-09-01T12:00:00Z"),
        endAt: new Date("2026-09-01T13:00:00Z"),
        googleCalendarId: "cal-1",
        googleEventId: null,
        dirty: true,
        ownedByApp: true,
        mirrored: false,
      },
      {
        id: "b3",
        title: "C",
        startAt: new Date("2026-09-01T14:00:00Z"),
        endAt: new Date("2026-09-01T15:00:00Z"),
        googleCalendarId: "cal-1",
        googleEventId: "ok-id",
        dirty: true,
        ownedByApp: true,
        mirrored: false,
      },
    ];

    mocks.dbSelect
      .mockReturnValueOnce(selectChain([{ refreshTokenEnc: "enc" }]))
      .mockReturnValueOnce(selectChain([{ calendarId: "cal-1" }]))
      .mockReturnValueOnce(selectChain(blocks));

    mocks.patchEvent
      .mockRejectedValueOnce({ code: 500 })
      .mockResolvedValueOnce({ id: "ok-id" });
    mocks.insertEvent.mockResolvedValueOnce({});

    const updates: ReturnType<typeof updateChain>[] = [];
    mocks.dbUpdate.mockImplementation(() => {
      const chain = updateChain();
      updates.push(chain);
      return chain;
    });

    await pushDirtyBlocks();

    expect(mocks.patchEvent).toHaveBeenCalledTimes(2);
    expect(mocks.insertEvent).toHaveBeenCalledTimes(1);

    const setPayloads = updates.map((u) => u._set);
    expect(setPayloads).toEqual([
      { dirty: false, googleCalendarId: "cal-1" },
    ]);
  });
});
