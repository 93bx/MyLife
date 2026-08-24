import { describe, expect, it } from "vitest";
import {
  overloadWarning,
  partitionSmsFirst,
  workdayCapacityMinutes,
} from "./plan";

describe("partitionSmsFirst", () => {
  it("puts sms type first", () => {
    const { sms, extra } = partitionSmsFirst([
      { id: "a", type: "study", estimateMinutes: 25 },
      { id: "b", type: "sms", estimateMinutes: 30 },
    ]);
    expect(sms.map((t) => t.id)).toEqual(["b"]);
    expect(extra.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("overloadWarning", () => {
  it("warns when estimates exceed capacity", () => {
    expect(overloadWarning(300, 240)).toBe(true);
    expect(overloadWarning(100, 240)).toBe(false);
  });
});

describe("workdayCapacityMinutes", () => {
  it("uses profile work window (default 09:30–17:30 → 480)", () => {
    expect(workdayCapacityMinutes("09:30", "17:30")).toBe(480);
    expect(workdayCapacityMinutes("10:00", "14:00")).toBe(240);
  });

  it("falls back to 480 when times are invalid or inverted", () => {
    expect(workdayCapacityMinutes("", "")).toBe(480);
    expect(workdayCapacityMinutes("17:30", "09:30")).toBe(480);
    expect(workdayCapacityMinutes("nope", "17:30")).toBe(480);
  });
});
