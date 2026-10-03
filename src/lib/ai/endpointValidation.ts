import type { AiEndpointKind } from "./types";

const KINDS = new Set<AiEndpointKind>(["provider", "aggregator", "local"]);

export function parseAiEndpointKind(raw: unknown): AiEndpointKind | null {
  if (typeof raw !== "string") return null;
  return KINDS.has(raw as AiEndpointKind) ? (raw as AiEndpointKind) : null;
}

export function isAbsoluteHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type EndpointCreateInput = {
  kind?: string;
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string | null;
  trainsOnPrompts?: boolean;
  enabled?: boolean;
  sortOrder?: number;
};

export type ValidatedEndpointCreate = {
  kind: AiEndpointKind;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string | null;
  trainsOnPrompts: boolean;
  enabled: boolean;
  sortOrder: number;
};

export function validateEndpointCreate(
  body: EndpointCreateInput,
): { ok: true; value: ValidatedEndpointCreate } | { ok: false; error: string } {
  const kind = parseAiEndpointKind(body.kind);
  if (!kind) {
    return { ok: false, error: "kind must be provider, aggregator, or local" };
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
  if (!name || !baseUrl) {
    return { ok: false, error: "kind, name, and baseUrl are required" };
  }
  if (!isAbsoluteHttpUrl(baseUrl)) {
    return { ok: false, error: "baseUrl must be an absolute http(s) URL" };
  }
  const apiKey = typeof body.apiKey === "string" ? body.apiKey : "";
  if (kind !== "local" && !apiKey.trim()) {
    return { ok: false, error: "apiKey is required for provider and aggregator" };
  }
  return {
    ok: true,
    value: {
      kind,
      name,
      baseUrl,
      apiKey,
      model:
        typeof body.model === "string" && body.model.trim()
          ? body.model.trim()
          : null,
      trainsOnPrompts: body.trainsOnPrompts ?? false,
      enabled: body.enabled ?? true,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    },
  };
}
