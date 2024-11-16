import { Annotation, LangGraphRunnableConfig } from "@langchain/langgraph";
import { SYSTEM_PROMPT_TEMPLATE } from "../../prompts.js";

export const ConfigurationAnnotationTemplate = Annotation.Root({
  userId: Annotation<string>(),
  model: Annotation<string>(),
  systemPrompt: Annotation<string>(),
  assistantId: Annotation<string>(),
});

export type Configuration = typeof ConfigurationAnnotationTemplate.State;

export function ensureConfiguration(config?: LangGraphRunnableConfig) {
  const configurable = config?.configurable || {};
  return {
    userId: configurable?.userId || "default",
    model: configurable?.model || "openai/gpt-4o",
    systemPrompt: configurable?.systemPrompt || SYSTEM_PROMPT_TEMPLATE,
    assistantId: configurable?.assistantId || "default",
  };
}
