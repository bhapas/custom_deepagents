// @ts-ignore
import { z } from "zod";
import { SubAgent } from "../types";
import { ToolRunnableConfig, tool } from "@langchain/core/tools";
import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { ToolNode, createReactAgent } from "@langchain/langgraph/prebuilt";
import { getDefaultModel } from "../model";
import { logMem } from "../logging";
import { TASK_TOOL_DESCRIPTION } from "./prompts";
import { IntegrationAgentState } from "../state";
import { ChatBedrockConverse } from "@langchain/aws";

export const createTaskTool = (inputs: {
  subagents: SubAgent[];
  model: ChatBedrockConverse;
}) => {
  const { subagents, model = getDefaultModel() } = inputs;
  const agentsMap = new Map<string, any>();
  for (const subagent of subagents) {
    // Create react agent for the subagent
    logMem(`createReactAgent start: ${subagent.name}`);

    const reactAgent = createReactAgent({
      llm: model,
      tools: (subagent.tools || []) as any,
      messageModifier: subagent.prompt,
      stateSchema: IntegrationAgentState,
    });
    logMem(`createReactAgent done: ${subagent.name}`);

    agentsMap.set(subagent.name, reactAgent);
  }

  return tool(
    async (
      input: { description: string; subagent_name: string },
      config: ToolRunnableConfig
    ) => {
      const state = IntegrationAgentState;
      const tool_call_id = config?.toolCall?.id as string;
      const subAgent = agentsMap.get(input.subagent_name);

      const modifiedState = {
        ...state,
        messages: [{ role: "user", content: input.description }],
      };

      try {
        const result = await subAgent.invoke(modifiedState);

        // Prepare state update (excluding "messages")
        const state_update: Partial<typeof IntegrationAgentState> = {};
        for (const [k, v] of Object.entries(result)) {
          if (k !== "messages") {
            state_update[k] = v;
          }
        }

        return new Command({
          update: {
            ...state_update,
            messages: [
              new ToolMessage({
                content: result.messages?.slice(-1)[0]?.content,
                tool_call_id,
              }),
            ],
          },
        });
      } catch (e) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `Error executing task with ${input.subagent_name}: ${String(e)}`,
                tool_call_id,
              }),
            ],
          },
        });
      }
    },
    {
      name: "task",
      description: TASK_TOOL_DESCRIPTION.replace(
        "{available_agents}",
        subagents.map((a) => `- ${a.name}: ${a.description}`).join("\n")
      ),
      schema: z.object({
        description: z
          .string()
          .describe("The task to execute with the selected agent"),
        subagent_name: z
          .string()
          .describe(
            `Name of the agent to use. Available: ${subagents.map((a) => a.name).join(", ")}`
          ),
      }),
    }
  );
};
