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

/**
 * DeepAgentState using LangGraph's Annotation.Root() pattern
 * Extends MessagesAnnotation with todos channel
 */
export const DeepAgentState = MessagesZodState.extend({
  todos: z.custom<Todo[]>().default([]),
  logSamples: z.array(z.string()).default([]),
  current_pipeline: z.object({}).default({}),
  pipeline_validation_results: z.object({
    pipeline_generation_results: z.object({}).default({}),
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
    pipeline_generation_results: {},
    success_rate: 100,
    successful_samples: 0,
    failed_samples: 0,
    total_samples: 0,
    failure_details: [],
  }),
});

export const SubAgentState = MessagesZodState.extend({
  logSamples: z.array(z.string()).default([]),
  current_pipeline: z.object({}).default({}),
  pipeline_validation_results: z.object({
    pipeline_generation_results: z.object({}).default({}),  
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
    pipeline_generation_results: {},
    success_rate: 100,
    successful_samples: 0,
    failed_samples: 0,
    total_samples: 0,
    failure_details: [],
  }),
});
