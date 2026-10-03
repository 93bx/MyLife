import type { AiEndpoint } from "./types";

export type AiRoutingMode =
  | "local-first"
  | "cloud-first"
  | "local-only"
  | "cloud-only";

const MODES = new Set<AiRoutingMode>([
  "local-first",
  "cloud-first",
  "local-only",
  "cloud-only",
]);

export function parseAiRoutingMode(raw: unknown): AiRoutingMode | null {
  if (typeof raw !== "string") return null;
  return MODES.has(raw as AiRoutingMode) ? (raw as AiRoutingMode) : null;
}

function isLocal(e: AiEndpoint): boolean {
  return e.kind === "local";
}

export function orderEndpointsForMode(
  endpoints: AiEndpoint[],
  mode: AiRoutingMode,
): AiEndpoint[] {
  const local = endpoints.filter(isLocal);
  const cloud = endpoints.filter((e) => !isLocal(e));
  switch (mode) {
    case "cloud-first":
      return [...cloud, ...local];
    case "local-first":
      return [...local, ...cloud];
    case "cloud-only":
      return cloud;
    case "local-only":
      return local;
  }
}
