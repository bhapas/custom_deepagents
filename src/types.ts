import { BaseLanguageModelInput, LanguageModelOutput } from "@langchain/core/language_models/base";
import { Runnable } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import { AnnotationRoot } from "@langchain/langgraph";


export interface SubAgent {
  name: string;
  description: string;
  prompt: string;
  tools?: StructuredTool[];
}

export type LanguageModelLike = Runnable<
  BaseLanguageModelInput,
  LanguageModelOutput
>;

export type TodoStatus = "pending" | "in_progress" | "completed";

export interface Todo {
  content: string;
  status: TodoStatus;
}

export type AnyAnnotationRoot = AnnotationRoot<any>;

export interface CreateIntegrationAgentParams {
  baseAgentTools?: StructuredTool[];
  instructions?: string;
  model?: LanguageModelLike;
  subagents?: SubAgent[];
  builtinTools?: string[];
}