import { Annotation, LangGraphRunnableConfig } from '@langchain/langgraph';
import { INLINE_OPTIONS_INSTRUCTION, MAIN_INSTRUCTION } from 'prompts.js';

export const ConfigurationAnnotationTemplate = Annotation.Root({
  userId: Annotation<string>(),
  model: Annotation<string>(),
  mainInstruction: Annotation<string>(),
  inlineOptionsInstruction: Annotation<string>(),
  assistantId: Annotation<string>(),
  contextMessage: Annotation<string>(),
});

export type Configuration = typeof ConfigurationAnnotationTemplate.State;

export function ensureConfiguration(config?: LangGraphRunnableConfig) {
  const configurable = config?.configurable || {};
  return {
    userId: configurable?.userId || 'default',
    model: configurable?.model || 'openai/gpt-4o',
    assistantId: configurable?.assistantId || 'default',
    mainInstruction: MAIN_INSTRUCTION,
    inlineOptionsInstruction: INLINE_OPTIONS_INSTRUCTION,
    inlineOptionContext: configurable?.inlineOptionContext || '',
  };
}
