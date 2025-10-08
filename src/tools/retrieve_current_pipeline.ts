import { ToolRunnableConfig, tool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";
import { IntegrationAgentState } from "../state";
import { logMem } from "../logging";

// Schema for the tool (no input needed, reads from state)
const retrieveCurrentPipelineSchema = z.object({});

/**
 * Tool to retrieve the current pipeline from state
 */
export const retrieveCurrentPipelineTool = tool(
  async (
    {}: z.infer<typeof retrieveCurrentPipelineSchema>,
    config: ToolRunnableConfig
  ) => {
    try {
      const currentState =
        getCurrentTaskInput<z.infer<typeof IntegrationAgentState>>();

      logMem("Retrieving current pipeline from state");

      const currentPipeline = currentState.current_pipeline;

      if (!currentPipeline || Object.keys(currentPipeline).length === 0) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: JSON.stringify({
                  current_pipeline: {},
                  message:
                    "No pipeline found in state. Generate and validate a pipeline first.",
                }),
                tool_call_id: config?.toolCall?.id as string,
              }),
            ],
          },
        });
      }

      logMem("Current pipeline retrieved successfully");

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({
                current_pipeline: currentPipeline,
              }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    } catch (error) {
      const errorMessage = `Error retrieving current pipeline: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({
                error: errorMessage,
                current_pipeline: {},
              }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
  {
    name: "retrieve_current_pipeline",
    description:
      "Retrieves the current pipeline from state. Run this after pipeline validation succeeds to get the current pipeline configuration for modifications or ECS mapping.",
    schema: retrieveCurrentPipelineSchema,
  }
);

