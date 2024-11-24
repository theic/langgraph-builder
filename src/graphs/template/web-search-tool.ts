import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { LangGraphRunnableConfig } from '@langchain/langgraph';

export function getWebSearchTool(config?: LangGraphRunnableConfig) {
  const searchTool = new TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
    maxResults: 1,
  });

  searchTool.name = 'web_search';
  searchTool.description = 'Searches the web for current information about a given query';

  return searchTool;
}
