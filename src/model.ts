import { ChatBedrockConverse } from "@langchain/aws";
import { LanguageModelLike } from "./types";
import { Client } from "@elastic/elasticsearch";

export function getDefaultModel(): LanguageModelLike {
  return new ChatBedrockConverse({
    model: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    maxTokens: 4096,
  });
}

// Initialize a singleton Elasticsearch client for local instance
// Reused across tool calls to avoid opening many sockets
export const sharedEsClient = new Client({
  node: "http://localhost:9200",
});