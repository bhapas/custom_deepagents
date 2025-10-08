// @ts-ignore
import { getDefaultModel } from "../model";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createTaskTool } from "./subAgent";
import { IntegrationAgentState } from "../state";
import { CreateIntegrationAgentParams } from "../types";
import { StructuredTool } from "@langchain/core/tools";
import { INTEGRATION_CREATION_SUPERVISOR_PROMPT } from "./prompts";

export const createIntegrationAgent = (
  params: CreateIntegrationAgentParams
) => {
  const { baseAgentTools = [], model = getDefaultModel(), subagents = [] } = params;

  const stateSchema = IntegrationAgentState;
  const allTools: StructuredTool[] = baseAgentTools;

  const taskTool = createTaskTool({
    subagents,
    model,
  });
  allTools.push(taskTool);

  // Return createReactAgent with proper configuration
  return createReactAgent<typeof stateSchema, typeof IntegrationAgentState>({
    name: "integration_supervisor",
    llm: model,
    tools: allTools as any,
    stateSchema,
    messageModifier: INTEGRATION_CREATION_SUPERVISOR_PROMPT,
  });
};
