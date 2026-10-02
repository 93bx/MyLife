import { describe, expect, it, vi } from "vitest";
import type { calendar_v3 } from "googleapis";
import { deleteEvent, isWritableCalendar } from "./calendarClient";

describe("isWritableCalendar", () => {
  it("allows owner and writer", () => {
    expect(isWritableCalendar({ accessRole: "owner" })).toBe(true);
    expect(isWritableCalendar({ accessRole: "writer" })).toBe(true);
  });

  it("excludes reader and freeBusyReader", () => {
    expect(isWritableCalendar({ accessRole: "reader" })).toBe(false);
    expect(isWritableCalendar({ accessRole: "freeBusyReader" })).toBe(false);
  });

  it("excludes missing accessRole", () => {
    expect(isWritableCalendar({})).toBe(false);
    expect(isWritableCalendar({ accessRole: null })).toBe(false);
  });
});

describe("deleteEvent", () => {
  it("calls events.delete with calendarId and eventId", async () => {
    const deleteFn = vi.fn().mockResolvedValue({});
    const client = {
      events: { delete: deleteFn },
    } as unknown as calendar_v3.Calendar;

    await deleteEvent(client, "cal-1", "evt-9");

    expect(deleteFn).toHaveBeenCalledWith({
      calendarId: "cal-1",
      eventId: "evt-9",
    });
  });
});
