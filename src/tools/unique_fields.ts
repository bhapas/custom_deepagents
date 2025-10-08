import { ToolRunnableConfig, tool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";
import { IntegrationAgentState } from "../state";
import { logMem } from "../logging";
import { cleanEmptyValues } from "../util";

// Schema for the tool (no input needed, reads from state)
const getUniqueFieldsSchema = z.object({});

/**
 * Tool to extract unique fields from pipeline validation results in state
 */
export const getUniqueFieldsTool = tool(
  async (
    {}: z.infer<typeof getUniqueFieldsSchema>,
    config: ToolRunnableConfig
  ) => {
    try {
      const currentState =
        getCurrentTaskInput<z.infer<typeof IntegrationAgentState>>();

      // Check if pipeline validation results exist
      const failureCount = currentState.failure_count;
      const pipelineGenerationResults =
        currentState.pipeline_generation_results;

      if (pipelineGenerationResults && failureCount === 0) {
        // Extract unique fields from successful results
        const results = pipelineGenerationResults.docs || [];
        let uniqueFields: Record<string, any> = {};
        logMem("Extracting unique fields from successful pipeline results " + JSON.stringify(pipelineGenerationResults, null, 2));

        if (results.length > 0) {
          logMem("Extracting unique fields from successful pipeline results");
          results.forEach((result: any) => {
            const message = result.doc?._source;
            // Early return if message doesn't exist or isn't an object
            if (!message || typeof message !== "object") {
              return;
            }
            Object.keys(message).forEach((key) => {
              // Skip if key already exists in uniqueFields
              if (key in uniqueFields) {
                return;
              }
              const cleanedValue = cleanEmptyValues(message[key]);
              // Skip if value is empty after cleaning
              if (cleanedValue === undefined) {
                return;
              }
              uniqueFields[key] = cleanedValue;
            });
          });
        }

        const fieldCount = Object.keys(uniqueFields).length;
        logMem(`Extracted ${fieldCount} unique fields`);

        return new Command({
          update: {
            unique_fields: uniqueFields,
            messages: [
              new ToolMessage({
                content: JSON.stringify({
                  unique_fields: uniqueFields,
                  field_count: fieldCount,
                }),
                tool_call_id: config?.toolCall?.id as string,
              }),
            ],
          },
        });
      }
    } catch (error) {
      const errorMessage = `Error extracting unique fields: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({
                error: errorMessage,
                unique_fields: {},
              }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
  {
    name: "get_unique_fields",
    description:
      "Extracts unique fields with sample values from successful pipeline validation results in state. Run this after pipeline validation succeeds to get field names for ECS mapping.",
    schema: getUniqueFieldsSchema,
  }
);
