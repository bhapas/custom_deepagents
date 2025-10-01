import { z } from "zod";
import { tool, ToolRunnableConfig } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { indexService } from "../indexService";
import { logMem } from "../logging";

const verifySchema = z.object({
  integrationId: z.string().describe("Integration ID to fetch samples for"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Max number of samples to check (default 10, capped at 50)"),
});

function tryParseJson(value: string): unknown | Symbol {
  try {
    return JSON.parse(value);
  } catch {
    return INVALID;
  }
}

function isJsonObject(value: string): boolean {
  const parsed = tryParseJson(value);
  return parsed !== INVALID && typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
}

function isJsonValue(value: string): boolean {
  const parsed = tryParseJson(value);
  if (parsed === INVALID) return false;
  // Treat only objects/arrays as JSON logs; primitives are unlikely valid log payloads
  return typeof parsed === "object" && parsed !== null;
}

const INVALID = Symbol("invalid-json");

export const verifyJsonFormatTool = tool(
  async (
    { integrationId, limit }: z.infer<typeof verifySchema>,
    config: ToolRunnableConfig
  ) => {
    // Read from index and cap to 10 (or provided limit, max 50)
    const requested = Math.min(limit ?? 10, 50);
    const all = await indexService.readSamples(integrationId);
    logMem(`verify_json_format read ${all.length} samples for ${integrationId}`);
    const samples = all.slice(0, requested);
    if (samples.length === 0) {
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({ format: "OTHER", checked: 0, reason: "no-samples" }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    // Fail fast by inspecting a limited subset
    const MAX_CHECK = Math.min(samples.length, requested);

    // Case 1: Single blob - detect NDJSON by per-line JSON objects
    if (samples.length === 1) {
      const single = samples[0].trim();
      const lines = single.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length > 1) {
        let allObjects = true;
        for (let i = 0; i < Math.min(lines.length, 200); i++) {
          if (!isJsonObject(lines[i])) {
            allObjects = false;
            break; // fail fast
          }
        }
        if (allObjects) {
          return new Command({
            update: {
              messages: [
                new ToolMessage({
                  content: JSON.stringify({ format: "NDJSON", checked: Math.min(lines.length, 200) }),
                  tool_call_id: config?.toolCall?.id as string,
                }),
              ],
            },
          });
        }
      }

      // Fallback to JSON value detection
      const isJson = isJsonValue(single);
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({ format: isJson ? "JSON" : "OTHER", checked: 1 }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    // Case 2: Multiple samples - NDJSON if each sample is a JSON object
    let allObjects = true;
    for (let i = 0; i < MAX_CHECK; i++) {
      if (!isJsonObject(samples[i])) {
        allObjects = false;
        break; // fail fast
      }
    }
    if (allObjects) {
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({ format: "NDJSON", checked: MAX_CHECK }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    // If not all objects, check if all are valid JSON values (objects/arrays)
    let allJsonValues = true;
    for (let i = 0; i < MAX_CHECK; i++) {
      if (!isJsonValue(samples[i])) {
        allJsonValues = false;
        break; // fail fast
      }
    }
    if (allJsonValues) {
      // Mixed objects/arrays across lines -> lean towards NDJSON if majority are objects, else OTHER
      let objectCount = 0;
      for (let i = 0; i < MAX_CHECK; i++) {
        if (isJsonObject(samples[i])) objectCount++;
      }
      if (objectCount / MAX_CHECK > 0.8) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: JSON.stringify({ format: "NDJSON", checked: MAX_CHECK }),
                tool_call_id: config?.toolCall?.id as string,
              }),
            ],
          },
        });
      }
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({ format: "OTHER", checked: MAX_CHECK }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    // Otherwise, classify as OTHER
    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: JSON.stringify({ format: "OTHER", checked: MAX_CHECK }),
            tool_call_id: config?.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "verify_json_format",
    description:
      "Fetches up to N samples from index by integration_id and verifies if they are JSON, NDJSON, or OTHER using fast heuristics.",
    schema: verifySchema,
  }
);


