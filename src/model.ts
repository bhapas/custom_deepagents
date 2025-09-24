import { ChatBedrockConverse } from "@langchain/aws";
import { LanguageModelLike } from "./types";

export function getDefaultModel(): LanguageModelLike {
  return new ChatBedrockConverse({
    model: "us.anthropic.claude-sonnet-4-20250514-v1:0",
    maxTokens: 4096,
  });
}
