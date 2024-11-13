import { Annotation, LangGraphRunnableConfig } from "@langchain/langgraph";
import { SYSTEM_PROMPT_BUILDER } from '../../prompts.js';

export const ConfigurationAnnotationBuilder = Annotation.Root({
  userId: Annotation<string>(),
  model: Annotation<string>(),
  systemPrompt: Annotation<string>(),
  assistantId: Annotation<string>(),
});

export type Configuration = typeof ConfigurationAnnotationBuilder.State;

export function ensureConfiguration(config?: LangGraphRunnableConfig) {
  const configurable = config?.configurable || {};
  return {
    userId: configurable?.userId || "default",
    model: configurable?.model || "gpt-4o",
    systemPrompt: configurable?.systemPrompt || SYSTEM_PROMPT_BUILDER,
    assistantId: configurable?.assistantId || "default",
  };
}
