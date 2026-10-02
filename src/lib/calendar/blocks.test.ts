import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  dbInsert: vi.fn(),
  dbUpdate: vi.fn(),
  dbDelete: vi.fn(),
  deleteEvent: vi.fn(),
  createCalendarClient: vi.fn(),
  getAccessToken: vi.fn(),
  decryptToken: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mocks.dbSelect,
    insert: mocks.dbInsert,
    update: mocks.dbUpdate,
    delete: mocks.dbDelete,
  },
}));

vi.mock("@/lib/google/calendarClient", () => ({
  deleteEvent: mocks.deleteEvent,
  createCalendarClient: mocks.createCalendarClient,
}));

vi.mock("@/lib/google/oauth", () => ({
  getAccessToken: mocks.getAccessToken,
}));

vi.mock("@/lib/google/crypto", () => ({
  decryptToken: mocks.decryptToken,
}));

import {
  createOwnedBlock,
  deleteOwnedBlock,
  listMergedBlocks,
  updateOwnedBlock,
} from "./blocks";

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

function insertReturning(row: unknown) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([row]),
    }),
  };
}

function updateReturning(row: unknown) {
  const chain = {
    set: vi.fn(),
    where: vi.fn(),
  };
  chain.set.mockReturnValue(chain);
  chain.where.mockReturnValue({
    returning: vi.fn().mockResolvedValue([row]),
  });
  return chain;
}

function deleteWhere() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

const window = {
  start: new Date("2026-09-01T00:00:00Z"),
  end: new Date("2026-09-08T00:00:00Z"),
};

describe("calendar blocks ownership guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges foreign and owned blocks overlapping the window", async () => {
    mocks.dbSelect.mockReturnValueOnce(
      selectChain([
        {
          id: "foreign-1",
          title: "Meeting",
          foreignSummary: "Team sync",
          startAt: new Date("2026-09-02T14:00:00Z"),
          endAt: new Date("2026-09-02T15:00:00Z"),
          ownedByApp: false,
          mirrored: true,
          dirty: false,
          taskId: null,
          googleEventId: "g1",
          googleCalendarId: "cal-1",
        },
        {
          id: "owned-1",
          title: "Study",
          foreignSummary: null,
          startAt: new Date("2026-09-02T10:00:00Z"),
          endAt: new Date("2026-09-02T11:00:00Z"),
          ownedByApp: true,
          mirrored: false,
          dirty: true,
          taskId: null,
          googleEventId: null,
          googleCalendarId: "cal-1",
        },
      ]),
    );

    const blocks = await listMergedBlocks(window);
    expect(blocks.map((b) => b.id)).toEqual(["owned-1", "foreign-1"]);
    expect(blocks[0]?.editable).toBe(true);
    expect(blocks[1]?.editable).toBe(false);
    expect(blocks[1]?.title).toBe("Team sync");
  });

  it("creates owned blocks dirty with primary googleCalendarId", async () => {
    mocks.dbSelect.mockReturnValueOnce(
      selectChain([{ calendarId: "primary-cal" }]),
    );
    const created = {
      id: "new-1",
      title: "Focus",
      foreignSummary: null,
      startAt: new Date("2026-09-03T09:00:00Z"),
      endAt: new Date("2026-09-03T10:00:00Z"),
      ownedByApp: true,
      mirrored: false,
      dirty: true,
      taskId: null,
      googleEventId: null,
      googleCalendarId: "primary-cal",
    };
    mocks.dbInsert.mockReturnValueOnce(insertReturning(created));

    const block = await createOwnedBlock({
      title: "Focus",
      startAt: created.startAt,
      endAt: created.endAt,
    });

    expect(block.dirty).toBe(true);
    expect(block.editable).toBe(true);
    expect(block.googleCalendarId).toBe("primary-cal");
    expect(mocks.dbInsert).toHaveBeenCalled();
  });

  it("rejects PATCH on mirrored foreign rows", async () => {
    mocks.dbSelect.mockReturnValueOnce(
      selectChain([
        {
          id: "foreign-1",
          title: "Meeting",
          foreignSummary: "Meeting",
          startAt: new Date("2026-09-02T14:00:00Z"),
          endAt: new Date("2026-09-02T15:00:00Z"),
          ownedByApp: false,
          mirrored: true,
          dirty: false,
          taskId: null,
          googleEventId: "g1",
          googleCalendarId: "cal-1",
        },
      ]),
    );

    const result = await updateOwnedBlock({
      id: "foreign-1",
      title: "Hacked",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Foreign calendar events are read-only",
    });
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it("rejects DELETE on mirrored foreign rows", async () => {
    mocks.dbSelect.mockReturnValueOnce(
      selectChain([
        {
          id: "foreign-1",
          title: "Meeting",
          foreignSummary: "Meeting",
          startAt: new Date("2026-09-02T14:00:00Z"),
          endAt: new Date("2026-09-02T15:00:00Z"),
          ownedByApp: false,
          mirrored: true,
          dirty: false,
          taskId: null,
          googleEventId: "g1",
          googleCalendarId: "cal-1",
        },
      ]),
    );

    const result = await deleteOwnedBlock("foreign-1");

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Foreign calendar events cannot be deleted",
    });
    expect(mocks.dbDelete).not.toHaveBeenCalled();
  });

  it("allows PATCH and DELETE on owned non-mirrored blocks", async () => {
    const owned = {
      id: "owned-1",
      title: "Study",
      foreignSummary: null,
      startAt: new Date("2026-09-02T10:00:00Z"),
      endAt: new Date("2026-09-02T11:00:00Z"),
      ownedByApp: true,
      mirrored: false,
      dirty: false,
      taskId: null,
      googleEventId: null,
      googleCalendarId: "cal-1",
    };

    mocks.dbSelect.mockReturnValueOnce(selectChain([owned]));
    const updated = { ...owned, title: "Deep work", dirty: true };
    mocks.dbUpdate.mockReturnValueOnce(updateReturning(updated));

    const patchResult = await updateOwnedBlock({
      id: "owned-1",
      title: "Deep work",
    });
    expect(patchResult.ok).toBe(true);
    if (patchResult.ok) {
      expect(patchResult.block.title).toBe("Deep work");
      expect(patchResult.block.dirty).toBe(true);
    }

    mocks.dbSelect.mockReturnValueOnce(selectChain([owned]));
    mocks.dbDelete.mockReturnValueOnce(deleteWhere());
    const deleteResult = await deleteOwnedBlock("owned-1");
    expect(deleteResult).toEqual({ ok: true });
    expect(mocks.dbDelete).toHaveBeenCalled();
    expect(mocks.deleteEvent).not.toHaveBeenCalled();
  });

  it("rejects PATCH when merged startAt is not before endAt", async () => {
    const owned = {
      id: "owned-1",
      title: "Study",
      foreignSummary: null,
      startAt: new Date("2026-09-02T10:00:00Z"),
      endAt: new Date("2026-09-02T11:00:00Z"),
      ownedByApp: true,
      mirrored: false,
      dirty: false,
      taskId: null,
      googleEventId: null,
      googleCalendarId: "cal-1",
    };

    mocks.dbSelect.mockReturnValueOnce(selectChain([owned]));

    const result = await updateOwnedBlock({
      id: "owned-1",
      startAt: new Date("2026-09-02T12:00:00Z"),
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "startAt must be before endAt",
    });
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it("deletes linked Google event for owned block then deletes local row", async () => {
    const owned = {
      id: "owned-1",
      title: "Study",
      foreignSummary: null,
      startAt: new Date("2026-09-02T10:00:00Z"),
      endAt: new Date("2026-09-02T11:00:00Z"),
      ownedByApp: true,
      mirrored: false,
      dirty: false,
      taskId: null,
      googleEventId: "evt-1",
      googleCalendarId: "cal-1",
    };

    mocks.dbSelect
      .mockReturnValueOnce(selectChain([owned]))
      .mockReturnValueOnce(
        selectChain([{ refreshTokenEnc: "enc-token" }]),
      );
    mocks.decryptToken.mockReturnValue("refresh-token");
    mocks.getAccessToken.mockResolvedValue("access-token");
    mocks.createCalendarClient.mockReturnValue({ events: {} });
    mocks.deleteEvent.mockResolvedValue(undefined);
    mocks.dbDelete.mockReturnValueOnce(deleteWhere());

    const result = await deleteOwnedBlock("owned-1");

    expect(result).toEqual({ ok: true });
    expect(mocks.deleteEvent).toHaveBeenCalledWith(
      { events: {} },
      "cal-1",
      "evt-1",
    );
    expect(mocks.dbDelete).toHaveBeenCalled();
  });

  it("ignores Google 404 when deleting owned linked event", async () => {
    const owned = {
      id: "owned-1",
      title: "Study",
      foreignSummary: null,
      startAt: new Date("2026-09-02T10:00:00Z"),
      endAt: new Date("2026-09-02T11:00:00Z"),
      ownedByApp: true,
      mirrored: false,
      dirty: false,
      taskId: null,
      googleEventId: "evt-gone",
      googleCalendarId: "cal-1",
    };

    mocks.dbSelect
      .mockReturnValueOnce(selectChain([owned]))
      .mockReturnValueOnce(
        selectChain([{ refreshTokenEnc: "enc-token" }]),
      );
    mocks.decryptToken.mockReturnValue("refresh-token");
    mocks.getAccessToken.mockResolvedValue("access-token");
    mocks.createCalendarClient.mockReturnValue({ events: {} });
    mocks.deleteEvent.mockRejectedValue({ code: 404 });
    mocks.dbDelete.mockReturnValueOnce(deleteWhere());

    const result = await deleteOwnedBlock("owned-1");

    expect(result).toEqual({ ok: true });
    expect(mocks.dbDelete).toHaveBeenCalled();
  });
});
