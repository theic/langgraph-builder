import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ensureConfiguration } from "./configuration.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getStoreFromConfigOrThrow } from "../../utils.js";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

export function initializeTools(config?: LangGraphRunnableConfig) {
  // Initialize Tavily search tool
  const searchTool = new TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
  });

  searchTool.name = "web_search";

  /**
   * Upsert a system message (instruction) in the database.
   * @param system_message The system message content.
   * @param name The name of the AI Assistant.
   * @returns A string confirming the instruction storage.
   */
  async function upsertSystem(opts: {
    system_message?: string;
    name?: string;
  }): Promise<string> {
    const { system_message, name } = opts;
    if (!config || !config.store) {
      throw new Error("Config or store not provided");
    }

    const configurable = ensureConfiguration(config);
    const store = getStoreFromConfigOrThrow(config);

    const { userId, assistantId } = configurable;

    const item = await store.get(["system_messages", userId], assistantId);

    await store.put(
      ["system_messages", userId],
      assistantId,
      { system_message: system_message || item?.value.system_message, name: name || item?.value.name },
    );

    return `Stored system data for assistant ${assistantId}`;
  }

  const upsertSystemTool = tool(upsertSystem, {
    name: "upsert_system",
    description:
      "Upsert a system message (instruction) in the database for a specific user and assistant. \
      The system message will be stored using the assistantId as the key, ensuring one \
      system message per assistant. Can call multiple times in parallel if you need to \
      store or update multiple instructions.",
    schema: z.object({
      system_message: z.string().describe(
        "The system message content. For example: \
          'You are a helpful AI assistant focused on programming tasks.'",
      ).optional(),
      name: z.string().describe("The name of the AI Assistant.").optional(),
    }),
  });

  return [upsertSystemTool, searchTool];
}
