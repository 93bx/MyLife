import { describe, expect, it } from "vitest";
import * as schema from "./schema";
import {
  calendarBlocks,
  googleAccounts,
  googleCalendarSelections,
  googleSyncState,
} from "./schema";

describe("schema", () => {
  it("exports core tables", () => {
    expect(schema.tasks).toBeDefined();
    expect(schema.projects).toBeDefined();
    expect(schema.transactions).toBeDefined();
    expect(schema.aiEndpoints).toBeDefined();
    expect(schema.cashPingSkips).toBeDefined();
  });
});

describe("google calendar schema exports", () => {
  it("defines required tables", () => {
    expect(googleAccounts).toBeDefined();
    expect(googleCalendarSelections).toBeDefined();
    expect(calendarBlocks).toBeDefined();
    expect(googleSyncState).toBeDefined();
  });
});
