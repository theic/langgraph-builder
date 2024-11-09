import {
  LangGraphRunnableConfig,
  START,
  StateGraph,
  END,
} from "@langchain/langgraph";
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { initChatModel } from "langchain/chat_models/universal";
import {
  ConfigurationAnnotationTemplate,
  ensureConfiguration,
} from "./configuration-template.js";
import { GraphAnnotation } from "./state.js";
import { splitModelAndProvider } from "./utils.js";

const llm = await initChatModel();

const TITLE_SYSTEM_PROMPT = `You are a title generator. Based on the conversation history provided, generate a single concise and relevant title that captures the main topic or purpose of the conversation. 
- Respond with ONLY the title, no explanation or additional text
- Keep it under 6 words
- Do not use quotes or special characters
- Use Title Case`;

async function generateTitle(
  state: typeof GraphAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<{ messages: BaseMessage[] }> {
  const result = await llm.invoke(
    [{ role: "system", content: TITLE_SYSTEM_PROMPT }, ...state.messages],
    {
      configurable: {
        ...splitModelAndProvider("gpt-4o-mini"),
      },
    },
  );

  return { messages: [result] };
}

export const titleGenerator = new StateGraph(
  {
    stateSchema: GraphAnnotation,
  },
  ConfigurationAnnotationTemplate,
)
  .addNode("generate_title", generateTitle)
  .addEdge(START, "generate_title")
  .addEdge("generate_title", END);

export const graphTitle = titleGenerator.compile();
graphTitle.name = "Title Generator"; 