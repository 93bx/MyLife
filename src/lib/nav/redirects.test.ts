import { describe, expect, it } from "vitest";
import { LEGACY_REDIRECTS } from "./config";

describe("LEGACY_REDIRECTS", () => {
  it("matches Next.js redirect entry shape", () => {
    expect(LEGACY_REDIRECTS.length).toBeGreaterThan(0);

    for (const redirect of LEGACY_REDIRECTS) {
      expect(redirect).toEqual(
        expect.objectContaining({
          source: expect.any(String),
          destination: expect.any(String),
          permanent: true,
        }),
      );
      expect(redirect.source.startsWith("/")).toBe(true);
      expect(redirect.destination.startsWith("/")).toBe(true);
    }
  });

  it("covers the known legacy hub paths", () => {
    expect(LEGACY_REDIRECTS).toEqual([
      { source: "/calendar", destination: "/time/calendar", permanent: true },
      { source: "/money", destination: "/money/stats", permanent: true },
      { source: "/agent", destination: "/agent/chat", permanent: true },
      { source: "/tasks", destination: "/tasks/summary", permanent: true },
      { source: "/profile", destination: "/profile/personal", permanent: true },
    ]);
  });
});
