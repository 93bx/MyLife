import { describe, expect, it } from "vitest";
import { orderEndpointsForMode, parseAiRoutingMode } from "./orderEndpoints";
import type { AiEndpoint } from "./types";

function ep(
  partial: Pick<AiEndpoint, "name" | "kind"> & Partial<AiEndpoint>,
): AiEndpoint {
  return {
    baseUrl: "http://x",
    apiKey: "k",
    model: "m",
    trainsOnPrompts: false,
    enabled: true,
    ...partial,
  };
}

const cloudA = ep({ name: "groq", kind: "provider" });
const cloudB = ep({ name: "or", kind: "aggregator" });
const localA = ep({ name: "ollama", kind: "local", apiKey: "" });
const localB = ep({ name: "lms", kind: "local", apiKey: "" });

describe("parseAiRoutingMode", () => {
  it("accepts the four modes", () => {
    expect(parseAiRoutingMode("cloud-first")).toBe("cloud-first");
    expect(parseAiRoutingMode("local-first")).toBe("local-first");
    expect(parseAiRoutingMode("local-only")).toBe("local-only");
    expect(parseAiRoutingMode("cloud-only")).toBe("cloud-only");
  });

  it("rejects unknown", () => {
    expect(parseAiRoutingMode("hybrid")).toBeNull();
    expect(parseAiRoutingMode(null)).toBeNull();
  });
});

describe("orderEndpointsForMode", () => {
  const mixed = [cloudA, localA, cloudB, localB];

  it("cloud-first: cloud then local, stable within blocks", () => {
    expect(orderEndpointsForMode(mixed, "cloud-first").map((e) => e.name)).toEqual([
      "groq",
      "or",
      "ollama",
      "lms",
    ]);
  });

  it("local-first: local then cloud", () => {
    expect(orderEndpointsForMode(mixed, "local-first").map((e) => e.name)).toEqual([
      "ollama",
      "lms",
      "groq",
      "or",
    ]);
  });

  it("cloud-only drops local", () => {
    expect(orderEndpointsForMode(mixed, "cloud-only").map((e) => e.name)).toEqual([
      "groq",
      "or",
    ]);
  });

  it("local-only drops cloud", () => {
    expect(orderEndpointsForMode(mixed, "local-only").map((e) => e.name)).toEqual([
      "ollama",
      "lms",
    ]);
  });
});
