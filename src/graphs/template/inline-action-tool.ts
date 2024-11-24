import { tool } from '@langchain/core/tools';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { getStoreFromConfigOrThrow } from 'utils.js';
import { z } from 'zod';
import { ensureConfiguration } from './configuration.js';

export function getInlineActionTool(config: LangGraphRunnableConfig) {
  async function inlineAction({ inlineOptionContext }: { inlineOptionContext?: string }) {
    const store = getStoreFromConfigOrThrow(config);
    const configurable = ensureConfiguration(config);
    const item = await store.get(['system', configurable.userId], configurable.assistantId);
    const llm = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0,
    });

    console.debug('inlineOptionContext', inlineOptionContext);
    console.debug('inlineOptionsInstruction', item?.value.inlineOptionsInstruction);

    const result = await llm
      .withStructuredOutput(
        z.object({
          inlineOptions: z.array(z.string()),
          mainOptions: z.array(z.string()),
        }),
        {
          method: 'jsonSchema',
        }
      )
      .invoke([
        {
          role: 'system',
          content: `${configurable.inlineOptionsInstruction}\n\n${item?.value.inlineOptionsInstruction}`,
        },
        {
          role: 'user',
          content: inlineOptionContext ?? '',
        },
      ]);

    return {
      inlineOptions: result.inlineOptions || [],
      mainOptions: result.mainOptions || [],
    };
  }

  return tool(inlineAction, {
    name: 'inline_action',
    description: 'Generates a list of options based on the current message context',
    schema: z.object({
      inlineOptionContext: z.string().describe('The last AI message content'),
    }),
  });
}
