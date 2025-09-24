// @ts-ignore
import { getDefaultModel } from "../model";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createTaskTool } from "./subAgent";
import { DeepAgentState, SubAgentState } from "../state";
import { CreateIntegrationAgentParams } from "../types";
import { BUILTIN_TOOLS } from "../tools";
import { StructuredTool } from "@langchain/core/tools";
import { INTEGRATION_CREATION_SUPERVISOR_PROMPT } from "./prompts";

export const createIntegrationAgent = (
  params: CreateIntegrationAgentParams
) => {
  const { baseAgentTools = [], model = getDefaultModel(), subagents = [] } = params;

  const stateSchema = DeepAgentState;
  const allTools: StructuredTool[] = baseAgentTools;

  const taskTool = createTaskTool({
    subagents,
    model,
  });
  allTools.push(taskTool);

  // Return createReactAgent with proper configuration
  return createReactAgent<typeof stateSchema, Record<string, any>>({
    name: "integration_supervisor",
    llm: model,
    tools: allTools,
    stateSchema,
    messageModifier: INTEGRATION_CREATION_SUPERVISOR_PROMPT,
  });
};
