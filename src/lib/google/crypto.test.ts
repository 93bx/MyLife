import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./crypto";

describe("encryptToken", () => {
  it("round-trips", () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "test-key-32-chars-minimum!!!!";
    const enc = encryptToken("refresh-abc");
    expect(decryptToken(enc)).toBe("refresh-abc");
  });
});
