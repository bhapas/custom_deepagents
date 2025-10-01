import { SubAgent, SubAgentParams } from "../types";
import { LOG_ANALYZER_PROMPT } from "./prompts";
import { fetchSamplesTool } from "../tools/fetch_samples";
import { verifyJsonFormatTool } from "../tools/verify_json_format";

// SubAgent focused on analyzing raw log samples and summarizing their structure,
// edge-cases, and nuances. It also pulls in relevant guidance from Elasticsearch
// ingest pipeline processor documentation to inform parsing strategy.
function logsAnalyzerAgent(params?: Partial<SubAgentParams>): SubAgent {
  return {
    name: params?.name || "logs_analyzer",
    description: params?.description ||
      "Analyzes raw log samples to infer structure, fields, formats, and edge-cases; collates relevant Elasticsearch ingest processor documentation to guide parsing.",
    prompt: params?.prompt || LOG_ANALYZER_PROMPT,
    tools: params?.tools || [fetchSamplesTool, verifyJsonFormatTool],
  };
}

// Keep backward compatibility with the constant export
export const logsAnalyzer: SubAgent = logsAnalyzerAgent();