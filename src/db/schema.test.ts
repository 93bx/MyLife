import { describe, expect, it } from "vitest";
import * as schema from "./schema";

describe("schema", () => {
  it("exports core tables", () => {
    expect(schema.tasks).toBeDefined();
    expect(schema.projects).toBeDefined();
    expect(schema.transactions).toBeDefined();
    expect(schema.aiEndpoints).toBeDefined();
    expect(schema.cashPingSkips).toBeDefined();
  });
});
