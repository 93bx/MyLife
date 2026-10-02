import { describe, expect, it } from "vitest";
import { buildAttentionItems } from "./dashboardAttention";

describe("buildAttentionItems", () => {
  it("returns empty when nothing needs attention", () => {
    expect(
      buildAttentionItems({ overdueTasks: [], showCashPing: false }),
    ).toEqual([]);
  });

  it("maps each overdue task to an overdue_task item", () => {
    expect(
      buildAttentionItems({
        overdueTasks: [
          { id: "t1", title: "Pay rent" },
          { id: "t2", title: "Call dentist" },
        ],
        showCashPing: false,
      }),
    ).toEqual([
      {
        id: "t1",
        kind: "overdue_task",
        label: "Pay rent",
        href: "/tasks/overdue",
      },
      {
        id: "t2",
        kind: "overdue_task",
        label: "Call dentist",
        href: "/tasks/overdue",
      },
    ]);
  });

  it("adds unlogged_cash when showCashPing is true", () => {
    expect(
      buildAttentionItems({ overdueTasks: [], showCashPing: true }),
    ).toEqual([
      {
        id: "cash-ping",
        kind: "unlogged_cash",
        label: "No cash logged today",
        href: "/money/cash-ping",
      },
    ]);
  });

  it("orders overdue tasks, then cash ping, then doc expiries", () => {
    expect(
      buildAttentionItems({
        overdueTasks: [{ id: "t1", title: "Pay rent" }],
        showCashPing: true,
        docExpiries: [
          {
            id: "d1",
            label: "Passport expires soon",
            href: "/docs/d1",
          },
        ],
      }),
    ).toEqual([
      {
        id: "t1",
        kind: "overdue_task",
        label: "Pay rent",
        href: "/tasks/overdue",
      },
      {
        id: "cash-ping",
        kind: "unlogged_cash",
        label: "No cash logged today",
        href: "/money/cash-ping",
      },
      {
        id: "d1",
        kind: "doc_expiry",
        label: "Passport expires soon",
        href: "/docs/d1",
      },
    ]);
  });
});
