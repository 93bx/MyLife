import { describe, expect, it } from "vitest";
import {
  NAV_HUBS,
  LEGACY_REDIRECTS,
  hubDefaultPath,
  findHubForPathname,
} from "./config";

describe("NAV_HUBS", () => {
  it("lists Dashboard first with no children", () => {
    expect(NAV_HUBS[0]?.id).toBe("dashboard");
    expect(NAV_HUBS[0]?.children).toBeUndefined();
  });

  it("Time defaults to plan", () => {
    expect(hubDefaultPath("/time")).toBe("/time/plan");
  });

  it("finds Time hub for nested path", () => {
    expect(findHubForPathname("/time/calendar")?.id).toBe("time");
  });
});

describe("LEGACY_REDIRECTS", () => {
  it("maps calendar and hub roots", () => {
    const map = Object.fromEntries(
      LEGACY_REDIRECTS.map((r) => [r.source, r.destination]),
    );
    expect(map["/calendar"]).toBe("/time/calendar");
    expect(map["/money"]).toBe("/money/stats");
    expect(map["/agent"]).toBe("/agent/chat");
    expect(map["/tasks"]).toBe("/tasks/summary");
    expect(map["/profile"]).toBe("/profile/personal");
  });
});
