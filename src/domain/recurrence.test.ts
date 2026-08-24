import { describe, expect, it } from "vitest";
import { instanceDueFor, neededInstance } from "./recurrence";

describe("recurrence", () => {
  it("monthly dueFor is YYYY-MM-01 of asOf month", () => {
    expect(instanceDueFor("monthly", new Date("2026-08-24T12:00:00+03:00"))).toBe(
      "2026-08-01",
    );
  });

  it("yearly dueFor is YYYY-01-01 of asOf year", () => {
    expect(instanceDueFor("yearly", new Date("2026-08-24T12:00:00+03:00"))).toBe(
      "2026-01-01",
    );
  });

  it("daily dueFor is calendar date in Riyadh", () => {
    expect(instanceDueFor("daily", new Date("2026-08-24T12:00:00+03:00"))).toBe(
      "2026-08-24",
    );
  });

  it("does not spawn if instance already exists", () => {
    const t = {
      id: "r1",
      title: "Confirm salary",
      rruleOrKind: "monthly" as const,
      type: "confirm_income",
      resources: "money" as const,
      plannedSar: 7000,
    };
    expect(neededInstance(t, new Date("2026-08-24T12:00:00+03:00"), ["2026-08-01"])).toBeNull();
  });

  it("spawns when missing", () => {
    const t = {
      id: "r1",
      title: "Confirm salary",
      rruleOrKind: "monthly" as const,
      type: "confirm_income",
      resources: "money" as const,
      plannedSar: 7000,
    };
    expect(neededInstance(t, new Date("2026-08-24T12:00:00+03:00"), [])?.dueFor).toBe(
      "2026-08-01",
    );
  });
});
