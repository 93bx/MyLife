import { describe, expect, it } from "vitest";
import { skipTask } from "./skipTask";

describe("skipTask", () => {
  it("skips open tasks", () => {
    expect(skipTask({ status: "open" })).toEqual({ taskStatus: "skipped" });
  });

  it("rejects done and skipped", () => {
    expect(() => skipTask({ status: "done" })).toThrow(/not open/i);
    expect(() => skipTask({ status: "skipped" })).toThrow(/not open/i);
  });
});
