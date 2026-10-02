import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  pullCalendar: vi.fn(),
  pushDirtyBlocks: vi.fn(),
  registerChannel: vi.fn(),
  stopChannel: vi.fn(),
  getAccessToken: vi.fn(async () => "access-token"),
  decryptToken: vi.fn(() => "refresh-token"),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mocks.dbSelect,
  },
}));

vi.mock("./sync", () => ({
  pullCalendar: mocks.pullCalendar,
  pushDirtyBlocks: mocks.pushDirtyBlocks,
  registerChannel: mocks.registerChannel,
  stopChannel: mocks.stopChannel,
}));
vi.mock("@/lib/google/sync", () => ({
  pullCalendar: mocks.pullCalendar,
  pushDirtyBlocks: mocks.pushDirtyBlocks,
  registerChannel: mocks.registerChannel,
  stopChannel: mocks.stopChannel,
}));

vi.mock("./oauth", () => ({
  getAccessToken: mocks.getAccessToken,
}));
vi.mock("@/lib/google/oauth", () => ({
  getAccessToken: mocks.getAccessToken,
}));

vi.mock("./crypto", () => ({
  decryptToken: mocks.decryptToken,
}));
vi.mock("@/lib/google/crypto", () => ({
  decryptToken: mocks.decryptToken,
}));

import {
  handleCalendarWebhook,
  renewExpiringChannels,
  runSelectedCalendarSync,
} from "./triggerSync";

function selectChain(rows: unknown[]) {
  const chain: {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    then: (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  } = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(rows).then(onFulfilled, onRejected),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValue(rows);
  return chain;
}

describe("handleCalendarWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns bad_request when required headers are missing", async () => {
    const result = await handleCalendarWebhook({
      channelId: "",
      resourceId: "res-1",
      resourceState: "exists",
    });
    expect(result).toEqual({ status: "bad_request" });
    expect(mocks.pullCalendar).not.toHaveBeenCalled();
  });

  it("returns ok without pull for sync handshake", async () => {
    const result = await handleCalendarWebhook({
      channelId: "ch-1",
      resourceId: "res-1",
      resourceState: "sync",
    });
    expect(result).toEqual({ status: "ok" });
    expect(mocks.pullCalendar).not.toHaveBeenCalled();
  });

  it("pulls matching calendar for exists notification", async () => {
    mocks.dbSelect
      .mockReturnValueOnce(
        selectChain([
          {
            calendarId: "cal-1",
            channelId: "ch-1",
            resourceId: "res-1",
          },
        ]),
      )
      .mockReturnValueOnce(
        selectChain([{ refreshTokenEnc: "enc" }]),
      );

    const result = await handleCalendarWebhook({
      channelId: "ch-1",
      resourceId: "res-1",
      resourceState: "exists",
    });

    expect(result).toEqual({ status: "ok", calendarId: "cal-1" });
    expect(mocks.pullCalendar).toHaveBeenCalledWith("cal-1", {
      accessToken: "access-token",
    });
  });

  it("returns ok without pull when channel is unknown", async () => {
    mocks.dbSelect.mockReturnValueOnce(selectChain([]));

    const result = await handleCalendarWebhook({
      channelId: "unknown",
      resourceId: "res-1",
      resourceState: "exists",
    });

    expect(result).toEqual({ status: "ok" });
    expect(mocks.pullCalendar).not.toHaveBeenCalled();
  });
});

describe("runSelectedCalendarSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_WEBHOOK_URL;
  });

  it("no-ops when Google is not connected", async () => {
    mocks.dbSelect.mockReturnValueOnce(selectChain([]));

    const result = await runSelectedCalendarSync();

    expect(result).toEqual({
      connected: false,
      pulled: 0,
      renewed: 0,
    });
    expect(mocks.pullCalendar).not.toHaveBeenCalled();
    expect(mocks.pushDirtyBlocks).not.toHaveBeenCalled();
  });

  it("pulls selected calendars then pushes dirty blocks", async () => {
    mocks.dbSelect
      .mockReturnValueOnce(
        selectChain([{ refreshTokenEnc: "enc" }]),
      )
      .mockReturnValueOnce(
        selectChain([
          { calendarId: "cal-1", selected: true },
          { calendarId: "cal-2", selected: true },
        ]),
      )
      .mockReturnValue(selectChain([]));

    mocks.pullCalendar.mockResolvedValue(undefined);
    mocks.pushDirtyBlocks.mockResolvedValue(undefined);

    const result = await runSelectedCalendarSync();

    expect(mocks.pullCalendar).toHaveBeenCalledTimes(2);
    expect(mocks.pullCalendar).toHaveBeenCalledWith("cal-1", {
      accessToken: "access-token",
    });
    expect(mocks.pullCalendar).toHaveBeenCalledWith("cal-2", {
      accessToken: "access-token",
    });
    expect(mocks.pushDirtyBlocks).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      connected: true,
      pulled: 2,
      renewed: 0,
    });
  });
});

describe("renewExpiringChannels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_WEBHOOK_URL;
  });

  it("skips when webhook URL is unset", async () => {
    const renewed = await renewExpiringChannels();
    expect(renewed).toBe(0);
    expect(mocks.registerChannel).not.toHaveBeenCalled();
  });

  it("renews selected channels expiring within 24h", async () => {
    process.env.GOOGLE_WEBHOOK_URL = "https://example.com/api/google/calendar/webhook";
    const soon = new Date(Date.now() + 60 * 60 * 1000);
    const later = new Date(Date.now() + 48 * 60 * 60 * 1000);

    mocks.dbSelect
      .mockReturnValueOnce(
        selectChain([{ calendarId: "cal-1" }, { calendarId: "cal-2" }]),
      )
      .mockReturnValueOnce(
        selectChain([
          {
            calendarId: "cal-1",
            channelId: "ch-1",
            resourceId: "res-1",
            channelExpiration: soon,
          },
          {
            calendarId: "cal-2",
            channelId: "ch-2",
            resourceId: "res-2",
            channelExpiration: later,
          },
        ]),
      );

    mocks.stopChannel.mockResolvedValue(undefined);
    mocks.registerChannel.mockResolvedValue(undefined);

    const renewed = await renewExpiringChannels();

    expect(renewed).toBe(1);
    expect(mocks.stopChannel).toHaveBeenCalledWith("cal-1");
    expect(mocks.registerChannel).toHaveBeenCalledWith(
      "cal-1",
      "https://example.com/api/google/calendar/webhook",
    );
    expect(mocks.registerChannel).not.toHaveBeenCalledWith(
      "cal-2",
      expect.anything(),
    );
  });
});
