import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ensureConfiguration } from "./configuration.js";
import { v4 as uuidv4 } from "uuid";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getStoreFromConfigOrThrow } from "./utils.js";

/**
 * Initialize tools within a function so that they have access to the current
 * state and config at runtime.
 */
export function initializeTools(config?: LangGraphRunnableConfig) {
  /**
   * Upsert a system message (instruction) in the database.
   * @param content The system message content.
   * @param assistantId The ID of the assistant this instruction is for.
   * @param instructionId Optional ID to overwrite an existing instruction.
   * @returns A string confirming the instruction storage.
   */
  async function upsertSystemMessage(opts: {
    content: string;
    assistantId: string;
    instructionId?: string;
  }): Promise<string> {
    const { content, assistantId, instructionId } = opts;
    if (!config || !config.store) {
      throw new Error("Config or store not provided");
    }

    const configurable = ensureConfiguration(config);
    const sysId = instructionId || uuidv4();
    const store = getStoreFromConfigOrThrow(config);

    await store.put(
      ["system_messages", configurable.userId, assistantId],
      sysId,
      { content }
    );

    return `Stored system message ${sysId}`;
  }

  const upsertSystemMessageTool = tool(upsertSystemMessage, {
    name: "upsertSystemMessage",
    description:
      "Upsert a system message (instruction) in the database for a specific user and assistant. \
      If an instruction conflicts with an existing one, update the existing one by passing \
      in the instruction_id instead of creating a duplicate. Can call multiple times in parallel \
      if you need to store or update multiple instructions.",
    schema: z.object({
      content: z.string().describe(
        "The system message content. For example: \
          'You are a helpful AI assistant focused on programming tasks.'",
      ),
      assistantId: z.string().describe(
        "The ID of the assistant this instruction is for.",
      ),
      instructionId: z
        .string()
        .optional()
        .describe(
          "The instruction ID to overwrite. Only provide if updating an existing instruction.",
        ),
    }),
  });

  return [upsertSystemMessageTool];
}
