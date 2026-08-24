import type { AiEndpoint } from "./types";

export type SliceKind = "money" | "general";

/**
 * Money slices never hit train-on-prompts endpoints.
 * General slices drop them unless allowTrainOnFreeNonMoney is true.
 */
export function filterEndpointsForSlice(
  endpoints: AiEndpoint[],
  sliceKind: SliceKind,
  allowTrainOnFreeNonMoney: boolean,
): AiEndpoint[] {
  if (sliceKind === "money") {
    return endpoints.filter((e) => !e.trainsOnPrompts);
  }
  if (!allowTrainOnFreeNonMoney) {
    return endpoints.filter((e) => !e.trainsOnPrompts);
  }
  return endpoints;
}
