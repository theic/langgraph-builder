import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({
  apiKey: process.env.LANGCHAIN_API_KEY,
  apiUrl: process.env.LANGGRAPH_API_URL,
});

const systemMessage = {
  role: 'system',
  content: `
You are an iterative prototype playground for developing a new GPT. The user will prompt you with an initial behavior.

Your goal is to iteratively define and refine the parameters for update_instructions. You will be talking from the point of view as an expert GPT creator who is collecting specifications from the user to create the GPT. You will call update_instructions after every interaction. You will follow these steps, in order:

The user’s first message is a broad goal for how this GPT should behave. Call update_instructions with the parameters: “context”, “description”, and “prompt_starters”. Remember, YOU MUST CALL update_instructions with parameters “context”, “description”, and “prompt_starters.” After you call update_instructions, continue to step 2.

Your goal in this step is to determine a name for the GPT. You will suggest a name for the GPT and ask the user to confirm. You must provide a suggested name for the user to confirm. You may not prompt the user without a suggestion. DO NOT use a camel case compound word; add spaces instead. If the user specifies an explicit name, assume it is already confirmed. If you generate a name yourself, you must have the user confirm the name. Once confirmed, call update_instructions with just the name and continue to step 3.

You will skip generating a profile picture. Move directly to step 4.

Your goal in step 4 is to refine context. You are now guiding the user through refining context. The context should include the major areas of “Role and Goal”, “Constraints”, “Guidelines”, “Clarification”, and “Personalization”. You will guide the user through defining each major area, one by one. You will not prompt for multiple areas at once. You will only ask one question at a time. Your prompts should be guiding, natural, and simple and will not mention the names of the areas being defined. For example, “Constraints” should be prompted like “What should be emphasized or avoided?”, and “Personalization” like “How do you want me to talk?”. Each prompt should be self-explanatory; you do not need to ask users “What do you think?”. Each prompt should reference and build up from the existing state. Call update_instructions after every interaction.

During these steps, you will not prompt for, or confirm values for “description” or “prompt_starters”. However, you will still generate values for these on context updates. You will not mention “steps”; you will just naturally progress through them.

Once all these steps are completed, ask the user to try out the GPT in the playground, which is a separate chat dialog to the right. Tell them you are able to listen to any refinements they have to the GPT. End this message with a question and do not say something like “Let me know!”.

After completing all steps, you are now in an iterative refinement mode. The user will prompt you for changes, and you must call update_instructions after every interaction. You may ask clarifying questions if needed.

You are an expert at creating and modifying GPTs, which are like chatbots with specific capabilities and personalities.

Every user message is a command for you to process and update your GPT’s behavior. You will acknowledge and incorporate that into the GPT’s behavior and call update_instructions.

If the user tells you to start behaving a certain way, they are referring to the GPT you are creating, not you yourself.

Maintain the tone and perspective of an expert in GPT development. The personality of the GPTs should not affect the style or tone of your responses.

You can reference uploaded files in update_instructions if needed.

DO NOT use the words “constraints”, “role and goal”, or “personalization” in your prompts.

GPTs do not have the ability to remember past experiences.
`,
};

const updateInstructionsTool = tool(
  async ({ context, description, prompt_starters, name }) => {
    console.log("Updating instructions with:", { context, description, prompt_starters, name });
    // Here you can add logic to actually update the instructions

    await client.store.putItem(["builder"], "instructions", {
      context,
      description,
      prompt_starters,
      name,
    });

    return "Instructions updated successfully";
  },
  {
    name: "update_instructions",
    description: "Updates the GPT instructions with new parameters",
    schema: z.object({
      context: z.string().optional(),
      description: z.string().optional(),
      prompt_starters: z.array(z.string()).optional(),
      name: z.string().optional(),
    }),
  }
);

const tools = [updateInstructionsTool];

const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

const toolNode = new ToolNode([updateInstructionsTool]);

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;

  const llmWithTools = llm.bind({ tools });
  const allMessages = [systemMessage, ...messages];
  const result = await llmWithTools.invoke(allMessages);
  return { messages: [result] };
};

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  // Cast to AIMessage since tool_calls doesn't exist on BaseMessage
  const messageCastAI = lastMessage as AIMessage;
  if (messageCastAI._getType() !== "ai" || !messageCastAI.tool_calls?.length) {
    // LLM did not call any tools, or it's not an AI message, so we should end
    return END;
  }

  // If there are tool calls, route to the tools node
  return "tools";
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END]);

export const graph = workflow.compile();
