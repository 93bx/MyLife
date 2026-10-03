import { describe, expect, it, vi } from "vitest";
import { FreeAiExhaustedError, chatFree } from "./freeGateway";
import type { AiEndpoint } from "./types";

function jsonRes(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("chatFree", () => {
  it("failovers from aggregator 429 to provider 200", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonRes(429, { error: "rate" }))
      .mockResolvedValueOnce(
        jsonRes(200, {
          choices: [{ message: { content: "hello from groq" } }],
        }),
      );
    const endpoints: AiEndpoint[] = [
      {
        name: "openrouter",
        kind: "aggregator",
        baseUrl: "https://openrouter.example/v1",
        apiKey: "k1",
        model: "openrouter/free",
        trainsOnPrompts: false,
        enabled: true,
      },
      {
        name: "groq",
        kind: "provider",
        baseUrl: "https://groq.example/openai/v1",
        apiKey: "k2",
        model: "llama-3.3-70b",
        trainsOnPrompts: false,
        enabled: true,
      },
    ];
    const r = await chatFree(endpoints, [{ role: "user", content: "hi" }], { fetch });
    expect(r.content).toBe("hello from groq");
    expect(r.usedEndpointName).toBe("groq");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("skips disabled and exhausted pool", async () => {
    await expect(
      chatFree(
        [
          {
            name: "dead",
            kind: "provider",
            baseUrl: "https://x",
            apiKey: "k",
            model: "m",
            trainsOnPrompts: false,
            enabled: false,
          },
        ],
        [{ role: "user", content: "hi" }],
        { fetch: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(FreeAiExhaustedError);
  });

  it("omits Authorization when apiKey is empty", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonRes(200, {
        choices: [{ message: { content: "from local" } }],
      }),
    );
    await chatFree(
      [
        {
          name: "ollama",
          kind: "local",
          baseUrl: "http://127.0.0.1:11434/v1",
          apiKey: "",
          model: "llama",
          trainsOnPrompts: false,
          enabled: true,
        },
      ],
      [{ role: "user", content: "hi" }],
      { fetch },
    );
    const init = fetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["content-type"]).toBe("application/json");
  });

  it("sends Bearer when apiKey is present", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonRes(200, {
        choices: [{ message: { content: "ok" } }],
      }),
    );
    await chatFree(
      [
        {
          name: "groq",
          kind: "provider",
          baseUrl: "https://groq.example/openai/v1",
          apiKey: "secret",
          model: "m",
          trainsOnPrompts: false,
          enabled: true,
        },
      ],
      [{ role: "user", content: "hi" }],
      { fetch },
    );
    const init = fetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret");
  });
});
