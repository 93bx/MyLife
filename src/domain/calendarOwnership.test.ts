import { describe, expect, it } from "vitest";
import { agentMayModify } from "./calendarOwnership";

describe("agentMayModify", () => {
  it("truth table: only owned non-mirrored may be modified", () => {
    const cases: Array<{
      ownedByApp: boolean;
      mirrored: boolean;
      expected: boolean;
    }> = [
      { ownedByApp: true, mirrored: false, expected: true },
      { ownedByApp: true, mirrored: true, expected: false },
      { ownedByApp: false, mirrored: false, expected: false },
      { ownedByApp: false, mirrored: true, expected: false },
    ];

    for (const c of cases) {
      expect(
        agentMayModify({ ownedByApp: c.ownedByApp, mirrored: c.mirrored }),
        `ownedByApp=${c.ownedByApp} mirrored=${c.mirrored}`,
      ).toBe(c.expected);
    }
  });
});
