import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/client", () => ({
  db: {},
}));

import { ownedEventPayload } from "./sync";

describe("ownedEventPayload", () => {
  it("sets private extended property", () => {
    expect(
      ownedEventPayload({
        title: "Study",
        start: "2026-09-01T10:00:00Z",
        end: "2026-09-01T11:00:00Z",
      }),
    ).toMatchObject({
      extendedProperties: { private: { ownedByApp: "1" } },
    });
  });
});
