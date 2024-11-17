import { tool } from '@langchain/core/tools';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { z } from 'zod';
import { getStoreFromConfigOrThrow } from '../../utils.js';
import { ensureConfiguration } from './configuration.js';

export function initializeTools(config?: LangGraphRunnableConfig) {
  /**
   * Upsert a system message (instruction) in the database.
   * @param system_message The system message content.
   * @param name The name of the AI Assistant.
   * @returns A string confirming the instruction storage.
   */
  async function upsertSystem(opts: { system_message?: string; name?: string }): Promise<{
    success: boolean;
    system_message: string;
    name: string;
    name_old: string;
    system_message_old: string;
  }> {
    const { system_message, name } = opts;
    if (!config || !config.store) {
      throw new Error('Config or store not provided');
    }

    const configurable = ensureConfiguration(config);
    const store = getStoreFromConfigOrThrow(config);

    const { userId, assistantId } = configurable;

    const item = await store.get(['system_messages', userId], assistantId);

    await store.put(['system_messages', userId], assistantId, {
      system_message: system_message || item?.value.system_message,
      name: name || item?.value.name,
    });

    return {
      success: true,
      name: name || item?.value.name,
      system_message: system_message || item?.value.system_message,
      name_old: item?.value.name || '',
      system_message_old: item?.value.system_message || '',
    };
  }

  const upsertSystemTool = tool(upsertSystem, {
    name: 'upsert_system',
    description:
      'Upsert a system message (instruction) in the database for a specific user and assistant. \
      The system message will be stored using the assistantId as the key, ensuring one \
      system message per assistant.',
    schema: z.object({
      system_message: z
        .string()
        .describe(
          "The system message content. For example: \
          'You are a helpful AI assistant focused on programming tasks.'"
        )
        .optional(),
      name: z.string().describe('The name of the AI Assistant.').optional(),
    }),
  });

  return [upsertSystemTool];
}
