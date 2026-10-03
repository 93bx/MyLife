import { describe, expect, it } from "vitest";
import {
  assertCareerTagsOnly,
  normalizeTagList,
  serializeTags,
} from "./taskTags";

describe("normalizeTagList", () => {
  it("trims, lowercases, and dedupes", () => {
    expect(normalizeTagList([" Cert ", "CERT", "brand", "brand"])).toEqual([
      "cert",
      "brand",
    ]);
  });

  it("parses JSON string arrays", () => {
    expect(normalizeTagList('["sms","apply"]')).toEqual(["sms", "apply"]);
  });

  it("returns [] for invalid input", () => {
    expect(normalizeTagList(null)).toEqual([]);
    expect(normalizeTagList("{}")).toEqual([]);
  });
});

describe("serializeTags", () => {
  it("JSON-stringifies normalized list", () => {
    expect(serializeTags(["career", "sms"])).toBe('["career","sms"]');
  });
});

describe("assertCareerTagsOnly", () => {
  it("allows empty and locked tags", () => {
    expect(() => assertCareerTagsOnly([])).not.toThrow();
    expect(() => assertCareerTagsOnly(["career", "cert"])).not.toThrow();
  });

  it("rejects unknown tags", () => {
    expect(() => assertCareerTagsOnly(["career", "other"])).toThrow(
      /invalid tag/i,
    );
  });
});
