import { describe, expect, it } from "vitest";
import { overloadWarning, partitionSmsFirst } from "./plan";

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
