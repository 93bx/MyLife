import type { AiEndpoint, ChatMessage } from "./types";

export class FreeAiExhaustedError extends Error {
  constructor(message = "All free AI endpoints failed") {
    super(message);
    this.name = "FreeAiExhaustedError";
  }
}

type ChatFreeOpts = {
  fetch?: typeof globalThis.fetch;
};

type ChatCompletionBody = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

export async function chatFree(
  endpoints: AiEndpoint[],
  messages: ChatMessage[],
  opts: ChatFreeOpts = {},
): Promise<{ content: string; usedEndpointName: string }> {
  const fetchFn = opts.fetch ?? globalThis.fetch;

  for (const endpoint of endpoints.filter((e) => e.enabled)) {
    const url = `${endpoint.baseUrl.replace(/\/$/, "")}/chat/completions`;
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (endpoint.apiKey.trim()) {
        headers.Authorization = `Bearer ${endpoint.apiKey}`;
      }
      const res = await fetchFn(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: endpoint.model,
          messages,
        }),
      });

      // 401/402/429/5xx → next endpoint; empty completion also failovers below
      if (
        res.status === 401 ||
        res.status === 402 ||
        res.status === 429 ||
        res.status >= 500
      ) {
        continue;
      }

      const body = (await res.json()) as ChatCompletionBody;
      const content = body.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) {
        return { content, usedEndpointName: endpoint.name };
      }
    } catch {
      continue;
    }
  }

  throw new FreeAiExhaustedError();
}
