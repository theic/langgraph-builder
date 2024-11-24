import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { END, LangGraphRunnableConfig, START, StateGraph } from '@langchain/langgraph';
import { initChatModel } from 'langchain/chat_models/universal';
import { GraphAnnotation } from '../../state.js';
import { getStoreFromConfigOrThrow, splitModelAndProvider } from '../../utils.js';
import { ConfigurationAnnotationTemplate, ensureConfiguration } from './configuration.js';
import { getInlineActionTool } from './inline-action-tool.js';
import { getWebSearchTool } from './web-search-tool.js';

const llm = await initChatModel();

async function callModel(
  state: typeof GraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<{ messages: BaseMessage[] }> {
  const store = getStoreFromConfigOrThrow(config);
  const configurable = ensureConfiguration(config);
  const item = await store.get(['system', configurable.userId], configurable.assistantId);
  const lastMessage = state.messages[state.messages.length - 1];

  const tools = [getWebSearchTool(config)];
  const boundLLM = llm.bind({
    tools: tools,
    tool_choice: 'auto',
  });

  console.debug('Context message:', configurable.inlineOptionContext);

  const optionRequest = configurable.inlineOptionContext
    ? [
        {
          role: 'user',
          content: `Context: ${configurable.inlineOptionContext} Action: ${lastMessage.content}`,
        },
      ]
    : [];

  console.debug('mainInstruction', item?.value.mainInstruction || configurable.mainInstruction);

  const result = await boundLLM.invoke(
    [
      { role: 'system', content: item?.value.mainInstruction || configurable.mainInstruction },
      ...state.messages,
      ...optionRequest,
    ],
    {
      configurable: splitModelAndProvider(configurable.model),
    }
  );

  return { messages: [result] };
}

async function handleTools(
  state: typeof GraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<{ messages: BaseMessage[] }> {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  if (!toolCalls.length) {
    return { messages: [] };
  }

  const tools = [getWebSearchTool(config)];

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool ${toolCall.name} not found`);
      }
      const result = await tool.invoke(toolCall);
      return result;
    })
  );

  return { messages: toolMessages };
}

async function handleInlineAction(
  state: typeof GraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<{ messages: BaseMessage[] }> {
  const configurable = ensureConfiguration(config);

  const tools = [getInlineActionTool(config)];
  const boundLLM = llm.bind({
    tools: tools,
    tool_choice: 'inline_action',
  });

  const result = await boundLLM.invoke([...state.messages], {
    configurable: splitModelAndProvider(configurable.model),
  });

  return { messages: [result] };
}

async function handleOptionsTools(
  state: typeof GraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<{ messages: BaseMessage[] }> {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  if (!toolCalls.length) {
    return { messages: [] };
  }

  const tools = [getInlineActionTool(config)];

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool ${toolCall.name} not found`);
      }
      const result = await tool.invoke(toolCall);
      return result;
    })
  );

  return { messages: toolMessages };
}

const routeTools = (state: typeof GraphAnnotation.State): 'tools' | 'inline_action' => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (lastMessage.getType() === 'ai') {
    if ((lastMessage as AIMessage).tool_calls?.length) {
      return 'tools';
    }
  }

  return 'inline_action';
};

export const template = new StateGraph(
  {
    stateSchema: GraphAnnotation,
  },
  ConfigurationAnnotationTemplate
)
  .addNode('generate_answer', callModel)
  .addNode('tools', handleTools)
  .addNode('tools2', handleOptionsTools)
  .addNode('inline_action', handleInlineAction)
  .addEdge(START, 'generate_answer')
  .addEdge('tools', 'generate_answer')
  .addEdge('inline_action', 'tools2')
  .addEdge('tools2', END)
  .addConditionalEdges('generate_answer', routeTools, {
    tools: 'tools',
    inline_action: 'inline_action',
  });

export const graphTemplate = template.compile();
graphTemplate.name = 'Agent Template';
