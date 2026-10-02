import { beforeEach, describe, expect, it, vi } from "vitest";

const runSelectedCalendarSync = vi.fn();

vi.mock("@/lib/google/triggerSync", () => ({
  runSelectedCalendarSync,
}));

describe("POST /api/google/calendar/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns sync result from runSelectedCalendarSync", async () => {
    runSelectedCalendarSync.mockResolvedValueOnce({
      connected: true,
      pulled: 2,
      renewed: 1,
    });
    const { POST } = await import("./route");

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      connected: true,
      pulled: 2,
      renewed: 1,
    });
  });
});
