import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ensureConfiguration } from "./configuration-builder.js";
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
   * @param systemMessage The system message content.
   * @returns A string confirming the instruction storage.
   */
  async function upsertSystemMessage(opts: {
    systemMessage: string;
  }): Promise<string> {
    const { systemMessage } = opts;
    if (!config || !config.store) {
      throw new Error("Config or store not provided");
    }

    const configurable = ensureConfiguration(config);
    const store = getStoreFromConfigOrThrow(config);

    const { userId, assistantId } = configurable;

    await store.put(
      ["system_messages", userId],
      assistantId,
      { systemMessage }
    );

    return `Stored system data for assistant ${assistantId}`;
  }

  const upsertSystemMessageTool = tool(upsertSystemMessage, {
    name: "upsertSystemMessage",
    description:
      "Upsert a system message (instruction) in the database for a specific user and assistant. \
      The system message will be stored using the assistantId as the key, ensuring one \
      system message per assistant. Can call multiple times in parallel if you need to \
      store or update multiple instructions.",
    schema: z.object({
      systemMessage: z.string().describe(
        "The system message content. For example: \
          'You are a helpful AI assistant focused on programming tasks.'",
      ),
    }),
  });

  return [upsertSystemMessageTool];
}
