import { ingestPipelineValidatorTool } from "../tools/ingest_pipeline_validator";
import { SubAgent } from "../types";
import { INGEST_PIPELINE_GENERATOR_PROMPT } from "./prompts";

// SubAgent focused exclusively on generating Elasticsearch ingest pipelines.
// It must return ONLY a JSON object (no prose) that is a valid pipeline.
export const ingestPipelineGenerator: SubAgent = {
  name: "ingest_pipeline_generator",
  description:
    "Generates an Elasticsearch ingest pipeline JSON for the provided log samples and documentation.",
  // IMPORTANT: The prompt enforces JSON-only responses.
  prompt: INGEST_PIPELINE_GENERATOR_PROMPT,
tools: [ingestPipelineValidatorTool],
};

export default ingestPipelineGenerator;


