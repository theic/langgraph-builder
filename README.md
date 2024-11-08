# LangGraph Builder

A TypeScript framework for building personalized AI assistants using LangGraph, offering an alternative to OpenAI's GPTs. This project enables developers to create custom AI assistants with fine-grained control over conversation flow, memory management, and tool integration.

## Features

- Create custom AI assistants with persistent personalities and instructions
- Configure multiple LLM providers (OpenAI, Anthropic)
- Built-in memory management for maintaining context
- Extensible tool system for custom capabilities
- Two implementation patterns:
  - Template: Quick assistant creation with predefined flows
  - Builder: Advanced customization with full control over conversation logic

## Use Cases

- Build domain-specific AI assistants
- Create assistants with custom personality and knowledge
- Implement complex conversation flows with memory and tool usage
- Deploy assistants that maintain consistent behavior across conversations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```bash
OPENAI_API_KEY=your_key_here
# or
ANTHROPIC_API_KEY=your_key_here
```

3. Build and start:
```bash
npm run build
npm start
```

## Development

- `npm run lint` - Run linting
- `npm run format` - Format code
- `npm run build` - Build the project

## Architecture

The project uses LangGraph to orchestrate conversation flows and manage state. Key components include:
- State management for maintaining conversation context
- Tool integration for extended capabilities
- Configuration system for customizing assistant behavior
- Memory persistence for maintaining long-term context

## License

MIT License - See LICENSE file for details
