import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ensureConfiguration } from "./configuration.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getStoreFromConfigOrThrow } from "../../utils.js";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

export function initializeTools(config?: LangGraphRunnableConfig) {
  // Initialize Tavily search tool
  const searchTool = new TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
    maxResults: 2,
  });

  // Set tool properties after initialization
  searchTool.name = "web_search";
  searchTool.description = "Searches the web for current information about a given query";

  return [searchTool];
}
