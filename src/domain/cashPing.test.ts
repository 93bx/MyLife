import { describe, expect, it } from "vitest";
import { needsCashPing } from "./cashPing";

describe("needsCashPing", () => {
  it("returns true when today has no cash-out date", () => {
    expect(needsCashPing("2026-08-24", [])).toBe(true);
    expect(needsCashPing("2026-08-24", ["2026-08-23", "2026-08-22"])).toBe(
      true,
    );
  });

  it("returns false when today is among cash-out dates", () => {
    expect(needsCashPing("2026-08-24", ["2026-08-24"])).toBe(false);
    expect(
      needsCashPing("2026-08-24", ["2026-08-23", "2026-08-24", "2026-08-25"]),
    ).toBe(false);
  });
});
