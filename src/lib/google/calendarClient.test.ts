import { describe, expect, it } from "vitest";
import { isWritableCalendar } from "./calendarClient";

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
