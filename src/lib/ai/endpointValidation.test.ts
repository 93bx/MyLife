import { describe, expect, it } from "vitest";
import {
  isAbsoluteHttpUrl,
  parseAiEndpointKind,
  validateEndpointCreate,
} from "./endpointValidation";

describe("parseAiEndpointKind", () => {
  it("accepts provider aggregator local", () => {
    expect(parseAiEndpointKind("local")).toBe("local");
    expect(parseAiEndpointKind("provider")).toBe("provider");
    expect(parseAiEndpointKind("aggregator")).toBe("aggregator");
  });
  it("rejects other", () => {
    expect(parseAiEndpointKind("paid")).toBeNull();
  });
});

describe("isAbsoluteHttpUrl", () => {
  it("allows http and https", () => {
    expect(isAbsoluteHttpUrl("http://127.0.0.1:11434/v1")).toBe(true);
    expect(isAbsoluteHttpUrl("https://api.groq.com/openai/v1")).toBe(true);
  });
  it("rejects relative and other schemes", () => {
    expect(isAbsoluteHttpUrl("/v1")).toBe(false);
    expect(isAbsoluteHttpUrl("ftp://x")).toBe(false);
    expect(isAbsoluteHttpUrl("not a url")).toBe(false);
  });
});

describe("validateEndpointCreate", () => {
  it("requires name and baseUrl", () => {
    const r = validateEndpointCreate({ kind: "local" });
    expect(r.ok).toBe(false);
  });

  it("allows local with empty apiKey", () => {
    const r = validateEndpointCreate({
      kind: "local",
      name: "ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      apiKey: "",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.apiKey).toBe("");
      expect(r.value.model).toBeNull();
    }
  });

  it("rejects provider with empty apiKey", () => {
    const r = validateEndpointCreate({
      kind: "provider",
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: "",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects bad kind and bad url", () => {
    expect(
      validateEndpointCreate({
        kind: "paid",
        name: "x",
        baseUrl: "https://x",
        apiKey: "k",
      }).ok,
    ).toBe(false);
    expect(
      validateEndpointCreate({
        kind: "local",
        name: "x",
        baseUrl: "notaurl",
        apiKey: "",
      }).ok,
    ).toBe(false);
  });
});
