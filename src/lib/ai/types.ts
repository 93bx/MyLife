export type AiEndpointKind = "provider" | "aggregator" | "local";

export type AiEndpoint = {
  name: string;
  kind: AiEndpointKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  trainsOnPrompts: boolean;
  enabled: boolean;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
