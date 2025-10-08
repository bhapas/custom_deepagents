import { fetchSamplesTool } from "../tools/fetch_samples";
import { SubAgent, SubAgentParams } from "../types";
import { INGEST_PIPELINE_GENERATOR_PROMPT, TEXT_TO_ECS_PROMPT } from "./prompts";
import { getUniqueFieldsTool } from "../tools/unique_fields";

// SubAgent focused exclusively on generating Elasticsearch ingest pipelines.
// It must return ONLY a JSON object (no prose) that is a valid pipeline.
function textToEcsAgent(params?: Partial<SubAgentParams>): SubAgent {
  console.log("textToEcsAgent");
  return {
    name: params?.name || "text_to_ecs",
    description: params?.description ||
      "Provides ECS mapping for the provided fields.",
    prompt: params?.prompt || TEXT_TO_ECS_PROMPT,
    tools: params?.tools || [],
  };
}

export const textToEcs: SubAgent = textToEcsAgent();
