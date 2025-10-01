import { ToolRunnableConfig, tool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { z } from "zod";
import { indexService } from "../indexService";
import { logMem } from "../logging";

// Schema for the tool
const fetchSamplesSchema = z.object({
  integrationId: z
    .string()
    .describe("Integration ID to fetch samples for"),
});

/**
 * Tool to fetch log samples from Elasticsearch index by integration_id
 */
export const fetchSamplesTool = tool(
  async (
    { integrationId }: z.infer<typeof fetchSamplesSchema>,
    config: ToolRunnableConfig
  ) => {
    try {
      logMem(`Fetching samples for integration: ${integrationId}`);
      
      const samples = await indexService.readSamples(integrationId);
      
      if (samples.length === 0) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `No samples found for integration_id: ${integrationId}`,
                tool_call_id: config?.toolCall?.id as string,
              }),
            ],
          },
        });
      }
      
      logMem(`Fetched ${samples.length} samples`);
      
      return new Command({
        update: {
          logSamples: samples,
          messages: [
            new ToolMessage({
              content: `Successfully fetched ${samples.length} samples for integration: ${integrationId}`,
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    } catch (error) {
      const errorMessage = `Error fetching samples: ${error instanceof Error ? error.message : "Unknown error"}`;
      
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: errorMessage,
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
  {
    name: "fetch_samples",
    description:
      "Fetches log samples from the Elasticsearch index by integration_id. Returns samples and stores them in state.",
    schema: fetchSamplesSchema,
  }
);
