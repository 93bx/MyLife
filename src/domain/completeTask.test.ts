import { describe, expect, it } from "vitest";
import { completeTaskService } from "./completeTask";

describe("completeTaskService", () => {
  it("marks time-only tasks done without a transaction", () => {
    const r = completeTaskService(
      { id: "t1", resources: "time", status: "open", type: "log_cash" },
      {},
    );
    expect(r).toEqual({ taskStatus: "done", transaction: null });
  });

  it("requires actualSar for money tasks", () => {
    expect(() =>
      completeTaskService(
        { id: "t1", resources: "money", status: "open", type: "pay" },
        {},
      ),
    ).toThrow(/actualSar required/);
  });

  it("requires actualSar for both tasks", () => {
    expect(() =>
      completeTaskService(
        { id: "t1", resources: "both", status: "open", type: "pay" },
        {},
      ),
    ).toThrow(/actualSar required/);
  });

  it("posts income via completeMoneyTask for confirm_income", () => {
    const r = completeTaskService(
      {
        id: "t1",
        resources: "money",
        status: "open",
        type: "confirm_income",
      },
      { actualSar: 7000 },
    );
    expect(r.taskStatus).toBe("done");
    expect(r.transaction).toEqual({
      direction: "in",
      amountSar: 7000,
      taskId: "t1",
    });
  });

  it("posts outflow for pay with both resources", () => {
    const r = completeTaskService(
      { id: "t1", resources: "both", status: "open", type: "pay" },
      { actualSar: 1500 },
    );
    expect(r.transaction).toEqual({
      direction: "out",
      amountSar: 1500,
      taskId: "t1",
    });
  });
});
