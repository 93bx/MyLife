import { describe, expect, it } from "vitest";
import { parseCreateTaskBody } from "./createTask";

const base = {
  title: "Write cover letter",
  priority: "P2",
  resources: "time",
  type: "apply",
  tags: ["apply"],
  goalId: null,
  projectId: null,
  deadline: null,
  floating: true,
};

describe("parseCreateTaskBody", () => {
  it("accepts a valid payload and normalizes tags", () => {
    expect(
      parseCreateTaskBody({ ...base, tags: [" Apply ", "apply"] }),
    ).toEqual({
      ...base,
      tags: ["apply"],
    });
  });

  it("requires title, type, resources", () => {
    expect(() => parseCreateTaskBody({ ...base, title: "  " })).toThrow(
      /title/i,
    );
    expect(() => parseCreateTaskBody({ ...base, type: "" })).toThrow(/type/i);
    expect(() =>
      parseCreateTaskBody({ ...base, resources: "energy" }),
    ).toThrow(/resources/i);
  });

  it("rejects invalid priority and unknown tags", () => {
    expect(() =>
      parseCreateTaskBody({ ...base, priority: "P9" }),
    ).toThrow(/priority/i);
    expect(() =>
      parseCreateTaskBody({ ...base, tags: ["career", "other"] }),
    ).toThrow(/invalid tag/i);
  });

  it("defaults floating to true when omitted", () => {
    const { floating, ...rest } = base;
    void floating;
    expect(parseCreateTaskBody(rest).floating).toBe(true);
  });
});
