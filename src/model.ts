import { ChatBedrockConverse } from "@langchain/aws";
import { Client } from "@elastic/elasticsearch";

export function getDefaultModel(): ChatBedrockConverse {
  return new ChatBedrockConverse({
    model: "us.anthropic.claude-sonnet-4-20250514-v1:0",
    maxTokens: 4096,
  });
}

// Initialize a singleton Elasticsearch client for local instance
// Reused across tool calls to avoid opening many sockets
export const sharedEsClient = new Client({
  node: "http://localhost:9200",
});