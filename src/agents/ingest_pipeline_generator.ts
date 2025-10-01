import { ingestPipelineValidatorTool } from "../tools/ingest_pipeline_validator";
import { fetchSamplesTool } from "../tools/fetch_samples";
import { SubAgent, SubAgentParams } from "../types";
import { INGEST_PIPELINE_GENERATOR_PROMPT } from "./prompts";

// SubAgent focused exclusively on generating Elasticsearch ingest pipelines.
// It must return ONLY a JSON object (no prose) that is a valid pipeline.
function ingestPipelineGeneratorAgent(params?: Partial<SubAgentParams>): SubAgent {
  console.log("ingestPipelineGeneratorAgent");
  return {
    name: params?.name || "ingest_pipeline_generator",
    description: params?.description ||
      "Generates an Elasticsearch ingest pipeline JSON for the provided log samples and documentation.",
    // IMPORTANT: The prompt enforces JSON-only responses.
    prompt: params?.prompt || INGEST_PIPELINE_GENERATOR_PROMPT,
    tools: params?.tools || [fetchSamplesTool, ingestPipelineValidatorTool],
  };
}

export const ingestPipelineGenerator: SubAgent = ingestPipelineGeneratorAgent();
