import "server-only";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ALL_TOOLS } from "./tools";
import { getModelEndpoint } from "@/lib/ai";

// ─── Provider endpoint configs ───
const ENDPOINTS = {
  github: {
    baseURL: "https://models.github.ai/inference",
    getApiKey: () => {
      const tokens = [
        process.env.GITHUB_TOKEN,
        process.env.GITHUB_TOKEN_2,
        process.env.GITHUB_TOKEN_3,
      ].filter(Boolean) as string[];
      // Round-robin via random for load distribution
      return tokens[Math.floor(Math.random() * tokens.length)];
    },
  },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    getApiKey: () => process.env.GEMINI_API_KEY ?? "",
  },
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    getApiKey: () => process.env.GROQ_API_KEY ?? "",
  },
} as const;

/**
 * Create a ChatOpenAI instance for a specific model.
 * Routes to the correct provider endpoint automatically.
 */
function createChatModel(modelId: string): ChatOpenAI {
  const endpoint = getModelEndpoint(modelId);
  const config = ENDPOINTS[endpoint];

  return new ChatOpenAI({
    model: modelId,
    apiKey: config.getApiKey(),
    streaming: true,
    modelKwargs: { max_completion_tokens: 8192 },
    configuration: {
      baseURL: config.baseURL,
    },
  });
}

/**
 * Create a LangGraph ReAct agent with all tools bound.
 * Uses the specified model or falls back through available models.
 */
export function createAgent(modelId: string) {
  const llm = createChatModel(modelId);

  return createReactAgent({
    llm,
    tools: ALL_TOOLS,
  });
}

/**
 * Invoke the agent with streaming, yielding text chunks and tool events.
 * Returns an async generator that the route handler can consume for SSE.
 */
export async function* streamAgent(
  modelId: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
): AsyncGenerator<
  | { type: "text"; content: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_end"; name: string }
  | { type: "error"; message: string }
> {
  const agent = createAgent(modelId);

  const langchainMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  try {
    const stream = await agent.stream(
      { messages: langchainMessages },
      { streamMode: "messages" },
    );

    for await (const [message, metadata] of stream) {
      // Tool call events
      if (message._getType() === "tool") {
        const toolName = (message as { name?: string }).name ?? "unknown";
        // LangGraph sends tool messages after execution
        yield { type: "tool_end", name: toolName };
        continue;
      }

      // AI message chunks
      if (message._getType() === "ai") {
        const content = typeof message.content === "string" ? message.content : "";

        // Check for tool calls in the AI message
        const toolCalls = (message as { tool_calls?: Array<{ name: string }> }).tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          // This is the langgraph node that decided to call tools
          if (metadata?.langgraph_node === "agent") {
            for (const tc of toolCalls) {
              yield { type: "tool_start", name: tc.name };
            }
          }
          continue;
        }

        // Only yield text from the final agent response
        if (content && metadata?.langgraph_node === "agent") {
          yield { type: "text", content };
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent error";
    yield { type: "error", message };
  }
}
