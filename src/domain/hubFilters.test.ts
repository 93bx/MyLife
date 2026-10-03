import { describe, expect, it } from "vitest";
import {
  CAREER_TAGS,
  isCareerTask,
  isFreelanceDeliveryProject,
  isHistoryTask,
  isMoneyTask,
  isOpenTask,
  isOpportunityProject,
  isOverdueTask,
  isSmsDeliveryProject,
  isTimeTask,
  type HubProject,
  type HubTask,
} from "./hubFilters";

function task(overrides: Partial<HubTask> = {}): HubTask {
  return {
    status: "open",
    resources: "time",
    deadline: null,
    tags: [],
    goalId: null,
    projectId: null,
    ...overrides,
  };
}

function project(overrides: Partial<HubProject> = {}): HubProject {
  return {
    kind: "delivery",
    origin: "personal",
    ...overrides,
  };
}

describe("CAREER_TAGS", () => {
  it("lists locked career tag vocabulary", () => {
    expect(CAREER_TAGS).toEqual(["career", "cert", "brand", "sms", "apply"]);
  });
});

describe("isTimeTask", () => {
  it("matches resources time or both", () => {
    expect(isTimeTask(task({ resources: "time" }))).toBe(true);
    expect(isTimeTask(task({ resources: "both" }))).toBe(true);
    expect(isTimeTask(task({ resources: "money" }))).toBe(false);
  });
});

describe("isMoneyTask", () => {
  it("matches resources money or both", () => {
    expect(isMoneyTask(task({ resources: "money" }))).toBe(true);
    expect(isMoneyTask(task({ resources: "both" }))).toBe(true);
    expect(isMoneyTask(task({ resources: "time" }))).toBe(false);
  });
});

describe("isCareerTask", () => {
  it("matches when any CAREER_TAGS is present (case-sensitive lowercase)", () => {
    expect(isCareerTask(task({ tags: ["cert"] }))).toBe(true);
    expect(isCareerTask(task({ tags: ["apply", "other"] }))).toBe(true);
    expect(isCareerTask(task({ tags: ["Career"] }))).toBe(false);
    expect(isCareerTask(task({ tags: ["work"] }))).toBe(false);
    expect(isCareerTask(task({ tags: [] }))).toBe(false);
  });
});

describe("isOpenTask", () => {
  it("matches status open only", () => {
    expect(isOpenTask(task({ status: "open" }))).toBe(true);
    expect(isOpenTask(task({ status: "done" }))).toBe(false);
    expect(isOpenTask(task({ status: "skipped" }))).toBe(false);
  });
});

describe("isHistoryTask", () => {
  it("matches done or skipped", () => {
    expect(isHistoryTask(task({ status: "done" }))).toBe(true);
    expect(isHistoryTask(task({ status: "skipped" }))).toBe(true);
    expect(isHistoryTask(task({ status: "open" }))).toBe(false);
  });
});

describe("isOverdueTask", () => {
  // 15:30 UTC = 18:30 Asia/Riyadh on the same calendar day.
  const now = new Date("2026-10-03T15:30:00.000Z");

  it("is overdue when open and deadline day is before today in Asia/Riyadh", () => {
    expect(isOverdueTask(task({ deadline: "2026-10-02" }), now)).toBe(true);
    // 20:00 UTC 2 Oct = 23:00 Riyadh 2 Oct (still previous Riyadh day).
    expect(
      isOverdueTask(task({ deadline: "2026-10-02T20:00:00.000Z" }), now),
    ).toBe(true);
  });

  it("is not overdue on the same Asia/Riyadh calendar day", () => {
    expect(isOverdueTask(task({ deadline: "2026-10-03" }), now)).toBe(false);
    expect(
      isOverdueTask(task({ deadline: "2026-10-03T00:00:00.000Z" }), now),
    ).toBe(false);
  });

  it("treats late UTC evening as the next Riyadh day (UTC+3)", () => {
    // 22:00 UTC 3 Oct = 01:00 Riyadh 4 Oct → deadline 3 Oct is overdue.
    const lateUtc = new Date("2026-10-03T22:00:00.000Z");
    expect(isOverdueTask(task({ deadline: "2026-10-03" }), lateUtc)).toBe(true);
    expect(isOverdueTask(task({ deadline: "2026-10-03" }), lateUtc, "UTC")).toBe(
      false,
    );
  });

  it("is not overdue when deadline is in the future or missing", () => {
    expect(isOverdueTask(task({ deadline: "2026-10-04" }), now)).toBe(false);
    expect(isOverdueTask(task({ deadline: null }), now)).toBe(false);
  });

  it("requires open status", () => {
    expect(
      isOverdueTask(task({ status: "done", deadline: "2026-10-01" }), now),
    ).toBe(false);
    expect(
      isOverdueTask(task({ status: "skipped", deadline: "2026-10-01" }), now),
    ).toBe(false);
  });

  it("honors an explicit Profile timezone override", () => {
    const lateUtc = new Date("2026-10-03T22:00:00.000Z");
    expect(
      isOverdueTask(task({ deadline: "2026-10-03" }), lateUtc, "UTC"),
    ).toBe(false);
  });
});

describe("project hub filters", () => {
  it("isFreelanceDeliveryProject matches delivery with personal or hustle origin", () => {
    expect(isFreelanceDeliveryProject(project({ origin: "personal" }))).toBe(
      true,
    );
    expect(isFreelanceDeliveryProject(project({ origin: "hustle" }))).toBe(
      true,
    );
    expect(isFreelanceDeliveryProject(project({ origin: "sms" }))).toBe(false);
    expect(
      isFreelanceDeliveryProject(
        project({ kind: "opportunity", origin: "personal" }),
      ),
    ).toBe(false);
  });

  it("isSmsDeliveryProject matches delivery with sms origin", () => {
    expect(
      isSmsDeliveryProject(project({ kind: "delivery", origin: "sms" })),
    ).toBe(true);
    expect(
      isSmsDeliveryProject(project({ kind: "delivery", origin: "personal" })),
    ).toBe(false);
    expect(
      isSmsDeliveryProject(project({ kind: "opportunity", origin: "sms" })),
    ).toBe(false);
  });

  it("isOpportunityProject matches kind opportunity", () => {
    expect(isOpportunityProject(project({ kind: "opportunity" }))).toBe(true);
    expect(isOpportunityProject(project({ kind: "delivery" }))).toBe(false);
  });
});
