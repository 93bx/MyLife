import { describe, expect, it } from "vitest";
import { pickLatestInstance } from "./recurrenceIndex";

describe("pickLatestInstance", () => {
  it("returns null when empty", () => {
    expect(pickLatestInstance([])).toBeNull();
  });

  it("picks max dueFor", () => {
    expect(
      pickLatestInstance([
        { dueFor: "2026-09-01", status: "done" },
        { dueFor: "2026-10-01", status: "open" },
        { dueFor: null, status: "open" },
      ]),
    ).toEqual({ dueFor: "2026-10-01", status: "open" });
  });
});
