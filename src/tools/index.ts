import { simpleTodoTool } from "./manageTodoTool";
import { StructuredTool } from "@langchain/core/tools";

export const BUILTIN_TOOLS: StructuredTool[] = [
  simpleTodoTool,
];
