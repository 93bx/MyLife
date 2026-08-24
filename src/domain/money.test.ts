import { describe, expect, it } from "vitest";
import { completeMoneyTask, parseActualSarInput } from "./money";

describe("parseActualSarInput", () => {
  it("rejects blank and whitespace (does not coerce to 0)", () => {
    expect(parseActualSarInput("")).toEqual({
      ok: false,
      error: "Actual SAR is required. Enter a finite number.",
    });
    expect(parseActualSarInput("   ")).toEqual({
      ok: false,
      error: "Actual SAR is required. Enter a finite number.",
    });
    expect(parseActualSarInput(undefined)).toEqual({
      ok: false,
      error: "Actual SAR is required. Enter a finite number.",
    });
  });

  it("rejects non-numeric input", () => {
    expect(parseActualSarInput("abc").ok).toBe(false);
  });

  it("accepts finite numbers including zero when explicitly entered", () => {
    expect(parseActualSarInput("0")).toEqual({ ok: true, value: 0 });
    expect(parseActualSarInput("1200.5")).toEqual({ ok: true, value: 1200.5 });
  });
});

describe("completeMoneyTask", () => {
  it("refuses time-only tasks", () => {
    expect(() =>
      completeMoneyTask(
        { id: "t1", resources: "time", status: "open", type: "sms" },
        10,
      ),
    ).toThrow(/money/i);
  });

  it("posts income for confirm_income", () => {
    const r = completeMoneyTask(
      { id: "t1", resources: "money", status: "open", type: "confirm_income" },
      7000,
    );
    expect(r.taskStatus).toBe("done");
    expect(r.transaction).toEqual({
      direction: "in",
      amountSar: 7000,
      taskId: "t1",
    });
  });

  it("posts outflow for pay", () => {
    const r = completeMoneyTask(
      { id: "t1", resources: "both", status: "open", type: "pay" },
      1200,
    );
    expect(r.transaction.direction).toBe("out");
    expect(r.transaction.amountSar).toBe(1200);
  });

  it("requires actualSar to be a finite number", () => {
    expect(() =>
      completeMoneyTask(
        { id: "t1", resources: "money", status: "open", type: "pay" },
        Number.NaN,
      ),
    ).toThrow();
  });
});
