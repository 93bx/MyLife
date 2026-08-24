import { describe, expect, it } from "vitest";
import { filterEndpointsForSlice } from "./slice";

describe("filterEndpointsForSlice", () => {
  it("never sends money to train-on-free endpoints", () => {
    const ep = [
      {
        name: "gemini",
        kind: "provider" as const,
        baseUrl: "https://g",
        apiKey: "k",
        model: "gemini-flash",
        trainsOnPrompts: true,
        enabled: true,
      },
      {
        name: "groq",
        kind: "provider" as const,
        baseUrl: "https://q",
        apiKey: "k",
        model: "llama",
        trainsOnPrompts: false,
        enabled: true,
      },
    ];
    expect(filterEndpointsForSlice(ep, "money", false).map((e) => e.name)).toEqual([
      "groq",
    ]);
  });
});
