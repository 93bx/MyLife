import { describe, expect, it } from "vitest";
import { agentMayModify } from "./calendarOwnership";

describe("agentMayModify", () => {
  it("allows owned non-mirrored blocks", () => {
    expect(agentMayModify({ ownedByApp: true, mirrored: false })).toBe(true);
  });
  it("denies mirrored foreign events", () => {
    expect(agentMayModify({ ownedByApp: false, mirrored: true })).toBe(false);
  });
});
