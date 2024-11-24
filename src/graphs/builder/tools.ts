import { tool } from '@langchain/core/tools';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { z } from 'zod';
import { getStoreFromConfigOrThrow } from '../../utils.js';
import { ensureConfiguration } from './configuration.js';

interface AssistantInstructions {
  mainInstruction: string;
  inlineOptionsInstruction: string;
  mainOptionsInstruction: string;
  assistantName: string;
}

interface AssistantInstructionsHistory extends AssistantInstructions {
  success: boolean;
  old: AssistantInstructions;
}

export function initializeTools(config?: LangGraphRunnableConfig) {
  async function upsertSystem(
    opts: Partial<AssistantInstructions>
  ): Promise<AssistantInstructionsHistory> {
    const { mainInstruction, inlineOptionsInstruction, mainOptionsInstruction, assistantName } =
      opts;
    if (!config || !config.store) {
      throw new Error('Config or store not provided');
    }

    const configurable = ensureConfiguration(config);
    const store = getStoreFromConfigOrThrow(config);
    const { userId, assistantId } = configurable;

    const item = await store.get(['system', userId], assistantId);

    const updatedValues = {
      mainInstruction: mainInstruction || item?.value.mainInstruction,
      inlineOptionsInstruction: inlineOptionsInstruction || item?.value.inlineOptionsInstruction,
      mainOptionsInstruction: mainOptionsInstruction || item?.value.mainOptionsInstruction,
      assistantName: assistantName || item?.value.assistantName,
    };

    await store.put(['system', userId], assistantId, updatedValues);

    return {
      success: true,
      // Current values
      ...updatedValues,
      // Previous values nested under 'old'
      old: {
        mainInstruction: item?.value.mainInstruction || '',
        inlineOptionsInstruction: item?.value.inlineOptionsInstruction || '',
        mainOptionsInstruction: item?.value.mainOptionsInstruction || '',
        assistantName: item?.value.assistantName || '',
      },
    };
  }

  const upsertSystemTool = tool(upsertSystem, {
    name: 'upsert_system',
    description:
      'Upsert assistant instructions in the database for a specific user and assistant. \
      The instructions will be stored using the assistantId as the key, ensuring one \
      set of instructions per assistant.',
    schema: z.object({
      mainInstruction: z
        .string()
        .describe(
          "The main instruction for the assistant's behavior. For example: \
          'You are a helpful AI assistant focused on programming tasks.'"
        )
        .optional(),
      inlineOptionsInstruction: z
        .string()
        .describe(
          "Instructions for generating inline action buttons. For example: \
          'You only generate Yes and No options.'"
        )
        .optional(),
      mainOptionsInstruction: z
        .string()
        .describe(
          "Instructions for generating main action buttons. For example: \
          'Menu options: New Game, Load Game, Settings, Quit Game.'"
        )
        .optional(),
      assistantName: z.string().describe('The name of the AI Assistant.').optional(),
    }),
  });

  return [upsertSystemTool];
}
