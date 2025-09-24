import { z } from "zod";
import { ToolRunnableConfig, tool } from "@langchain/core/tools";
import { logMem } from "../logging";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

// Define types explicitly
interface TodoItem {
  id: string;
  task: string;
  status: "pending" | "completed";
  result?: unknown;
}

// Initialize todoList with explicit type and cap size to avoid memory growth
let todoList: TodoItem[] = [];
const MAX_TODOS = 1000;

// Define the schema with explicit types to avoid inference issues
const todoToolSchema = z.object({
  action: z
    .literal("create")
    .or(z.literal("update"))
    .or(z.literal("get"))
    .or(z.literal("clear")),
  task: z.string().optional(),
  taskId: z.string().optional(),
  result: z.unknown().optional(),
});

export const simpleTodoTool = tool(
  (params: z.infer<typeof todoToolSchema>, config: ToolRunnableConfig) => {
    const { action, task, taskId, result } = params;

    switch (action) {
      case "create": {
        if (!task) return { error: "Task description required for create" };
        const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newTodo: TodoItem = { id, task, status: "pending" };
        todoList.push(newTodo);
        if (todoList.length > MAX_TODOS) {
          // Trim oldest entries to cap memory
          todoList.splice(0, todoList.length - MAX_TODOS);
        }
        logMem(`todo.create size=${todoList.length}`);
        return new Command({
          update: {
            success: true,
            taskId: id,
            messages: [
              new ToolMessage({
                content: [
                  {
                    success: true,
                    taskId: id,
                    task: task,
                    result: `Created task: ${task}`,
                  },
                ],
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      }

      case "update": {
        if (!taskId) return { error: "Task ID required for update" };
        const taskIndex = todoList.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return { error: "Task not found" };

        todoList[taskIndex] = {
          ...todoList[taskIndex],
          status: "completed",
          ...(result && { result }),
        };

        logMem(`todo.update id=${taskId}`);
        return new Command({
          update: {
            success: true,
            messages: [
              new ToolMessage({
                content: [
                  {
                    success: true,
                    taskId: taskId,
                    task: todoList[taskIndex].task,
                    result: `Updated task: ${todoList[taskIndex].task}`,
                  },
                ],
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      }

      case "get": {
        logMem(`todo.get size=${todoList.length}`);
        return {
          success: true,
          todos: todoList.map((t) => ({
            id: t.id,
            task: t.task,
            status: t.status,
          })),
          count: todoList.length,
          completed: todoList.filter((t) => t.status === "completed").length,
        };
      }

      case "clear": {
        todoList = [];
        logMem("todo.clear");

        return new Command({
          update: {
            success: true,
            messages: [
              new ToolMessage({
                content: [
                  {
                    success: true,
                    result: "Todo list cleared",
                  },
                ],
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      }

      default: {
        return new Command({
          update: {
            success: false,
            messages: [
              new ToolMessage({
                content: [
                  {
                    success: false,
                    result: "Invalid action",
                  },
                ],
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      }
    }
  },
  {
    name: "simpleTodoTool",
    description: "Manage a simple todo list for pipeline creation workflow",
    schema: todoToolSchema,
  }
);
