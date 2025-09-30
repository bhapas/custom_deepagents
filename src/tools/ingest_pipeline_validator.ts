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
import { sampleService } from "../sampleService";
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
  sampleIndex: z
    .number()
    .optional()
    .describe("Index of current validation attempt (for retry tracking)"),
});

// Tool using `tool(func, config)` that returns a Command with ToolMessage
export const ingestPipelineValidatorTool = tool(
  async (
    { pipeline, sampleIndex = 0 }: z.infer<typeof validatorSchema>,
    config: ToolRunnableConfig
  ) => {
    try {
      const clientTool = new ElasticsearchIngestPipelineTool();

      // Get samples from the singleton service
      const logSamples = sampleService.getSamples();
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
      const matchRate =
        Math.round((successfulCount / totalSamples) * 100 * 100) / 100;

      const out = {
        success: failedCount === 0,
        totalSamples,
        successfulMatches: successfulCount,
        failedMatches: failedCount,
        matchRate,
        errors: failedSamples.map((f) => f.error),
        failedSamples,
        retryNeeded: failedCount > 0,
        sampleIndex,
        message:
          failedCount === 0
            ? `✅ All ${totalSamples} samples processed successfully!`
            : `❌ ${failedCount} out of ${totalSamples} samples failed. Retry needed.`,
      };
      logMem(`simulate result ready (success=${out.success})`);

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify(out),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    } catch (error) {
      const errOut = {
        success: false,
        totalSamples: sampleService.getCount(),
        successfulMatches: 0,
        failedMatches: sampleService.getCount(),
        matchRate: 0,
        errors: [
          `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        failedSamples: sampleService.getSamples().map((sample, index) => ({
          index,
          sample,
          error: "Validation failed",
        })),
        retryNeeded: true,
        sampleIndex,
      };
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify(errOut),
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
        "Takes in pipeline as a JSON object and validates it against loaded log samples. Returns detailed failure information for failed samples.",
      schema: validatorSchema,
    }
);
