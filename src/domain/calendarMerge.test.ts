import { describe, expect, it } from "vitest";
import { mergeCalendarItems } from "./calendarMerge";

const window = {
  start: new Date("2026-09-01T00:00:00Z"),
  end: new Date("2026-09-08T00:00:00Z"),
};

describe("mergeCalendarItems", () => {
  it("combines foreign and owned items sorted by start", () => {
    const foreign = [
      {
        id: "f1",
        title: "Meeting",
        startAt: new Date("2026-09-02T14:00:00Z"),
        endAt: new Date("2026-09-02T15:00:00Z"),
        ownedByApp: false,
        mirrored: true,
      },
    ];
    const owned = [
      {
        id: "o1",
        title: "Study",
        startAt: new Date("2026-09-02T10:00:00Z"),
        endAt: new Date("2026-09-02T11:00:00Z"),
        ownedByApp: true,
        mirrored: false,
      },
    ];
    const merged = mergeCalendarItems(foreign, owned, window);
    expect(merged.map((i) => i.id)).toEqual(["o1", "f1"]);
  });

  it("filters items outside the display window", () => {
    const owned = [
      {
        id: "in",
        title: "In window",
        startAt: new Date("2026-09-03T10:00:00Z"),
        endAt: new Date("2026-09-03T11:00:00Z"),
        ownedByApp: true,
        mirrored: false,
      },
      {
        id: "out",
        title: "Out of window",
        startAt: new Date("2026-09-10T10:00:00Z"),
        endAt: new Date("2026-09-10T11:00:00Z"),
        ownedByApp: true,
        mirrored: false,
      },
    ];
    const merged = mergeCalendarItems([], owned, window);
    expect(merged.map((i) => i.id)).toEqual(["in"]);
  });

  it("keeps overlapping foreign and owned events (no auto-delete)", () => {
    const foreign = [
      {
        id: "f1",
        title: "Foreign",
        startAt: new Date("2026-09-02T10:00:00Z"),
        endAt: new Date("2026-09-02T12:00:00Z"),
        ownedByApp: false,
        mirrored: true,
      },
    ];
    const owned = [
      {
        id: "o1",
        title: "Owned",
        startAt: new Date("2026-09-02T11:00:00Z"),
        endAt: new Date("2026-09-02T13:00:00Z"),
        ownedByApp: true,
        mirrored: false,
      },
    ];
    const merged = mergeCalendarItems(foreign, owned, window);
    expect(merged).toHaveLength(2);
    expect(merged.map((i) => i.id).sort()).toEqual(["f1", "o1"]);
  });
});
