// @ts-ignore
import { z } from "zod";
import { LanguageModelLike, SubAgent } from "../types";
import { ToolRunnableConfig, tool } from "@langchain/core/tools";
import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getDefaultModel } from "../model";
import { logMem } from "../logging";
import { TASK_TOOL_DESCRIPTION } from "./prompts";
import { SubAgentState } from "../state";

export const createTaskTool = (inputs: {
  subagents: SubAgent[];
  model: LanguageModelLike;
}) => {
  const { subagents, model = getDefaultModel() } = inputs;
  const agentsMap = new Map<string, any>();
  for (const subagent of subagents) {
    // Create react agent for the subagent
    logMem(`createReactAgent start: ${subagent.name}`);

    const reactAgent = createReactAgent({
      llm: model,
      tools: subagent.tools || [],
      messageModifier: subagent.prompt,
    });
    logMem(`createReactAgent done: ${subagent.name}`);

    agentsMap.set(subagent.name, reactAgent);
  }

  return tool(
    async (
      input: { description: string; subagent_name: string },
      config: ToolRunnableConfig
    ) => {
      const { description, subagent_name } = input;

      // Get the pre-created agent
      const reactAgent = agentsMap.get(subagent_name);
      if (!reactAgent) {
        return `Error: Agent '${subagent_name}' not found. Available agents: ${Array.from(agentsMap.keys()).join(", ")}`;
      }

      try {
        const currentState =
          getCurrentTaskInput<z.infer<typeof SubAgentState>>();

        const modifiedState = {
          ...currentState,
          messages: [
            {
              role: "user",
              content: description,
            },
          ],
        };

        // Execute the subagent with the task
        logMem(`invoke start: ${subagent_name}`);
        const result = await reactAgent.invoke(modifiedState, config);
        logMem(`invoke done: ${subagent_name}`);

        // Use Command for state updates and navigation between agents
        // Return the result using Command to properly handle subgraph state
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: result.messages?.slice(-1)[0]?.content,
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      } catch (error) {
        // Handle errors gracefully
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `Error executing task '${description}' with agent '${subagent_name}': ${errorMessage}`,
                tool_call_id: config.toolCall?.id as string,
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
