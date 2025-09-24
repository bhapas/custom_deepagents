import { SubAgent } from "../types";
import { LOG_ANALYZER_PROMPT } from "./prompts";

// SubAgent focused on analyzing raw log samples and summarizing their structure,
// edge-cases, and nuances. It also pulls in relevant guidance from Elasticsearch
// ingest pipeline processor documentation to inform parsing strategy.
export const logsAnalyzer: SubAgent = {
  name: "logs_analyzer",
  description:
    "Analyzes raw log samples to infer structure, fields, formats, and edge-cases; collates relevant Elasticsearch ingest processor documentation to guide parsing.",
  prompt: LOG_ANALYZER_PROMPT,
};

export default logsAnalyzer;
