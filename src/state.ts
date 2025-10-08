import "@langchain/langgraph/zod";
import { MessagesZodState } from "@langchain/langgraph";
import type { Todo } from "./types";
import { z } from "zod";

/**
 * Todo reducer function that replaces the entire todo list
 */
export function todoReducer(
  left: Todo[] | null | undefined,
  right: Todo[] | null | undefined
): Todo[] {
  if (right != null) {
    return right;
  }
  return left || [];
}

export const IntegrationAgentState = MessagesZodState.extend({
  todos: z.custom<Todo[]>().default([]),
  current_pipeline: z.object({}).default({}),
  unique_fields: z.object({}).default({}),
  pipeline_generation_results: z.object({
    docs: z
      .array(
        z.object({
          doc: z.object({
            _source: z.record(z.any()),
          }),
        })
      )
      .default([]),
  }).default({ docs: [] }),
  failure_count: z.number().min(0).default(0),
  pipeline_validation_results: z.object({
    success_rate: z.number().min(0).max(100).default(100),
    successful_samples: z.number().min(0).default(0),
    failed_samples: z.number().min(0).default(0),
    total_samples: z.number().min(0).default(0),
    failure_details: z
      .array(
        z.object({
          error: z.string(),
          sample: z.string(),
        })
      )
      .max(100)
      .default([]),
  }).default({
    success_rate: 100,
    successful_samples: 0,
    failed_samples: 0,
    total_samples: 0,
    failure_details: [],
  }),
});
