import {
  LangGraphRunnableConfig,
  START,
  StateGraph,
  END,
} from "@langchain/langgraph";
import { BaseMessage, } from "@langchain/core/messages";
import { initChatModel } from "langchain/chat_models/universal";
import {
  ConfigurationAnnotationTemplate,
  ensureConfiguration,
} from "./configuration.js";
import { GraphAnnotation } from "../../state.js";
import { getStoreFromConfigOrThrow, splitModelAndProvider } from "../../utils.js";

const llm = await initChatModel();

async function callModel(
  state: typeof GraphAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<{ messages: BaseMessage[] }> {
  const store = getStoreFromConfigOrThrow(config);
  const configurable = ensureConfiguration(config);
  const item = await store.get(["system_messages", configurable.userId], configurable.assistantId);

  const sys = item ? item.value.system_message : configurable.systemPrompt;

  const result = await llm.invoke(
    [{ role: "system", content: sys }, ...state.messages],
    {
      configurable: splitModelAndProvider(configurable.model),
    },
  );

  return { messages: [result] };
}

export const template = new StateGraph(
  {
    stateSchema: GraphAnnotation,
  },
  ConfigurationAnnotationTemplate,
)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model")
  .addEdge("call_model", END);

export const graphTemplate = template.compile();
graphTemplate.name = "Agent Template";
