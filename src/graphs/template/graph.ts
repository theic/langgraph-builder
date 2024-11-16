import {
  LangGraphRunnableConfig,
  START,
  StateGraph,
  END,
} from "@langchain/langgraph";
import { BaseMessage, AIMessage, FunctionMessage, ToolMessage } from "@langchain/core/messages";
import { initChatModel } from "langchain/chat_models/universal";
import {
  ConfigurationAnnotationTemplate,
  ensureConfiguration,
} from "./configuration.js";
import { GraphAnnotation } from "../../state.js";
import { getStoreFromConfigOrThrow, splitModelAndProvider } from "../../utils.js";
import { initializeTools } from "./tools.js";

const llm = await initChatModel();

async function callModel(
  state: typeof GraphAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<{ messages: BaseMessage[] }> {
  const store = getStoreFromConfigOrThrow(config);
  const configurable = ensureConfiguration(config);
  const item = await store.get(["system_messages", configurable.userId], configurable.assistantId);

  const sys = item ? item.value.system_message : configurable.systemPrompt;

  const tools = initializeTools(config);
  const boundLLM = llm.bind({
    tools: tools,
    tool_choice: "auto",
  });
  
  const result = await boundLLM.invoke(
    [{ role: "system", content: sys || configurable.systemPrompt }, ...state.messages],
    {
      configurable: splitModelAndProvider(configurable.model),
    },
  );

  return { messages: [result] };
}

async function handleTools(
  state: typeof GraphAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<{ messages: BaseMessage[] }> {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];
  
  const tools = initializeTools(config);
  const webSearchTool = tools[0];
  
  if (!lastMessage.tool_calls?.length) {
    return { messages: [] };
  }

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const result = await webSearchTool.invoke(toolCall.args);
      return new ToolMessage({
        content: result,
        name: 'web_search',
        tool_call_id: toolCall.id || ''
      });
    }),
  );

  return { messages: toolMessages };
}

const shouldContinue = (state: typeof GraphAnnotation.State): "web_search" | typeof END => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  
  if (lastMessage.getType() === "ai" && (lastMessage as AIMessage).tool_calls?.length) {
    return "web_search";
  }
  return END;
};

export const template = new StateGraph(
  {
    stateSchema: GraphAnnotation,
  },
  ConfigurationAnnotationTemplate,
)
  .addNode("call_model", callModel)
  .addNode("web_search", handleTools)
  .addEdge(START, "call_model")
  .addEdge("web_search", "call_model")
  .addConditionalEdges("call_model", shouldContinue, {
    web_search: "web_search",
    [END]: END,
  });

export const graphTemplate = template.compile();
graphTemplate.name = "Agent Template";
