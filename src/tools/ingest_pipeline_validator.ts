import { Client } from "@elastic/elasticsearch";
import {
  IngestSimulateRequest,
  IngestSimulateResponse,
} from "@elastic/elasticsearch/lib/api/types";
import { ToolRunnableConfig, tool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { z } from "zod";
import { logMem } from "../logging";
import { indexService } from "../indexService";
import { sharedEsClient } from "../model";

/**
 * Elasticsearch tool that simulates an ingest pipeline API call
 * This tool allows you to test pipeline configurations without actually ingesting data
 */
export class ElasticsearchIngestPipelineTool {
  private readonly client: Client;

  constructor(client: Client = sharedEsClient) {
    this.client = client;
  }

  /**
   * Simulate an ingest pipeline to test how documents would be processed
   * @param request - The pipeline simulation request
   * @returns Promise with simulation results
   */
  async simulateIngestPipeline(
    request: IngestSimulateRequest
  ): Promise<IngestSimulateResponse> {
    try {
      const response = await this.client.ingest.simulate(request);
      return response;
    } catch (error) {
      console.error("Error simulating ingest pipeline:", error);
      throw new Error(`Failed to simulate ingest pipeline: ${error}`);
    }
  }
}

// Schema for the tool
const validatorSchema = z.object({
  pipeline: z
    .object({
      processors: z.array(z.any()).describe("Array of pipeline processors"),
    })
    .describe("The Elasticsearch ingest pipeline configuration"),
  integrationId: z
    .string()
    .default("gateway")
    .describe("Integration ID to fetch samples from the index"),
  sampleIndex: z
    .number()
    .optional()
    .describe("Index of current validation attempt (for retry tracking)"),
});

// Tool using `tool(func, config)` that returns a Command with ToolMessage
export const ingestPipelineValidatorTool = tool(
  async (
    { pipeline, integrationId = "gateway", sampleIndex = 0 }: z.infer<typeof validatorSchema>,
    config: ToolRunnableConfig
  ) => {
    try {
      const clientTool = new ElasticsearchIngestPipelineTool();

      // Get samples from the Elasticsearch index
      const logSamples = await indexService.readSamples(integrationId);
      logMem(`Read ${logSamples.length} samples from index for integration: ${integrationId}`);

      if (logSamples.length === 0) {
        throw new Error(`No samples found for integration_id: ${integrationId}`);
      }
      
      const limitedSamples = logSamples.slice(0, 200);
      const docs = limitedSamples.map((sample, index) => ({
        _source: { message: sample, original_index: index },
      }));

      const simulationRequest: IngestSimulateRequest = { pipeline, docs };

      logMem(`simulate start (docs=${docs.length})`);
      const response =
        await clientTool.simulateIngestPipeline(simulationRequest);
      logMem("simulate done");

      const results = response.docs || [];
      const successfulMatches: number[] = [];
      const failedSamples: Array<{
        index: number;
        sample: string;
        error: string;
      }> = [];

      results.forEach((result, index) => {
        if ((result as any).error) {
          failedSamples.push({
            index,
            sample: logSamples[index],
            error: (result as any).error?.reason || "Unknown processing error",
          });
        } else {
          successfulMatches.push(index);
        }
      });

      const totalSamples = logSamples.length;
      const successfulCount = successfulMatches.length;
      const failedCount = failedSamples.length;
      const successRate =
        Math.round((successfulCount / totalSamples) * 100 * 100) / 100;

      const message =
        failedCount === 0
          ? `✅ All ${totalSamples} samples processed successfully!`
          : `❌ ${failedCount} out of ${totalSamples} samples failed. Retry needed.`;

      logMem(`simulate result ready (success=${failedCount === 0})`);

      return new Command({
        update: {
          current_pipeline: pipeline,
          pipeline_validation_results: {
            pipeline_generation_results: response,
            success_rate: successRate,
            successful_samples: successfulCount,
            failed_samples: failedCount,
            total_samples: totalSamples,
            failure_details: failedSamples.slice(0, 100).map((f) => ({
              error: f.error,
              sample: f.sample,
            })),
          },
          messages: [
            new ToolMessage({
              content: message,
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    } catch (error) {
      const errorMessage = `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`;
      
      // Try to get samples for error reporting
      let errorSamples: string[] = [];
      try {
        errorSamples = await indexService.readSamples(integrationId);
      } catch {
        // If we can't read samples, just use empty array
        errorSamples = [];
      }
      
      return new Command({
        update: {
          current_pipeline: pipeline,
          pipeline_validation_results: {
            pipeline_generation_results: {},
            success_rate: 0,
            successful_samples: 0,
            failed_samples: errorSamples.length,
            total_samples: errorSamples.length,
            failure_details: errorSamples.slice(0, 100).map((sample) => ({
              error: errorMessage,
              sample,
            })),
          },
          messages: [
            new ToolMessage({
              content: `Pipeline validation failed: ${errorMessage}`,
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
    {
      name: "validate_pipeline_all_samples",
      description:
        "Takes in pipeline as a JSON object and integration_id, then validates the pipeline against log samples from the Elasticsearch index. Returns detailed failure information for failed samples.",
      schema: validatorSchema,
    }
);
