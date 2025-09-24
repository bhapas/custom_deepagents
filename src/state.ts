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
});

export const SubAgentState = MessagesZodState.extend({
  logSamples: z.array(z.string()).default([]),
});
