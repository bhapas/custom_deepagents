import { ChatBedrockConverse } from "@langchain/aws";
import { StructuredTool } from "@langchain/core/tools";
import { AnnotationRoot } from "@langchain/langgraph";


export interface SubAgentParams {
  name: string;
  description: string;
  prompt: string;
  tools?: StructuredTool[];
}

export interface SubAgent {
  name: string;
  description: string;
  prompt: string;
  tools?: StructuredTool[];
}

export type TodoStatus = "pending" | "in_progress" | "completed";

export interface Todo {
  content: string;
  status: TodoStatus;
}

export type AnyAnnotationRoot = AnnotationRoot<any>;

export interface CreateIntegrationAgentParams {
  baseAgentTools?: StructuredTool[];
  instructions?: string;
  model?: ChatBedrockConverse;
  subagents?: SubAgent[];
  builtinTools?: string[];
}