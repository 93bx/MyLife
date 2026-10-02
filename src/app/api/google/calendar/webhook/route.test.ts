import { beforeEach, describe, expect, it, vi } from "vitest";

const handleCalendarWebhook = vi.fn();

vi.mock("@/lib/google/triggerSync", () => ({
  handleCalendarWebhook,
}));

describe("POST /api/google/calendar/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 400 when webhook validation fails", async () => {
    handleCalendarWebhook.mockResolvedValueOnce({ status: "bad_request" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/google/calendar/webhook", {
        method: "POST",
        headers: {
          "X-Goog-Channel-ID": "ch-1",
        },
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 200 for sync handshake and exists notifications", async () => {
    handleCalendarWebhook.mockResolvedValueOnce({ status: "ok" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/google/calendar/webhook", {
        method: "POST",
        headers: {
          "X-Goog-Channel-ID": "ch-1",
          "X-Goog-Resource-ID": "res-1",
          "X-Goog-Resource-State": "sync",
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(handleCalendarWebhook).toHaveBeenCalledWith({
      channelId: "ch-1",
      resourceId: "res-1",
      resourceState: "sync",
    });
  });
});
