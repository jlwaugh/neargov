import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  messageId?: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ProposalChatbotProps {
  proposalTitle: string;
  proposalContent: string;
  proposalId: string; // Added for tool calls
  replies: Array<{
    id: number;
    username: string;
    created_at: string;
    cooked: string;
    post_number: number;
  }>;
  proposalAuthor: string;
  model?: string;
}

export const ProposalChatbot = ({
  proposalTitle,
  proposalContent,
  proposalId,
  replies,
  proposalAuthor,
  model = "deepseek-ai/DeepSeek-V3.1", // Better function calling support
}: ProposalChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationHistoryRef = useRef<
    Array<{
      role: string;
      content: string | null;
      tool_calls?: any;
      tool_call_id?: string;
    }>
  >([]);

  // Define available tools
  const tools = [
    {
      type: "function",
      function: {
        name: "summarize_revisions",
        description:
          "Analyzes the complete revision and edit history of the proposal. Call this when user asks about: changes, edits, modifications, revisions, updates, what was changed, what changed, edit history, version history, or differences between versions. This tool fetches detailed information about all edits made to the proposal over time.",
        parameters: {
          type: "object",
          properties: {
            post_id: {
              type: "string",
              description: "The ID of the post to analyze revisions for",
            },
          },
          required: ["post_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "summarize_proposal",
        description:
          "Generates a comprehensive, detailed summary of the proposal's main content and key points. Call this when user asks for: summary, overview, main points, key details, what is this proposal about, explain this proposal, or breakdown of the proposal.",
        parameters: {
          type: "object",
          properties: {
            proposal_id: {
              type: "string",
              description: "The ID of the proposal to summarize",
            },
          },
          required: ["proposal_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "summarize_discussion",
        description:
          "Summarizes all replies, comments, and community discussion. Call this when user asks about: discussion, replies, comments, what people are saying, community feedback, debate, concerns raised, or opinions in the thread.",
        parameters: {
          type: "object",
          properties: {
            topic_id: {
              type: "string",
              description: "The ID of the topic to summarize discussion for",
            },
          },
          required: ["topic_id"],
        },
      },
    },
  ];

  // Execute tool calls
  const executeToolCall = async (
    toolName: string,
    args: any
  ): Promise<string> => {
    try {
      switch (toolName) {
        case "summarize_revisions":
          const revResponse = await fetch(
            `/api/proposals/${args.post_id}/revisions/summarize`,
            {
              method: "POST",
            }
          );
          if (!revResponse.ok)
            throw new Error("Failed to fetch revision summary");
          const revData = await revResponse.json();
          return `Revision Analysis:\n\n${
            revData.summary
          }\n\nTotal Revisions: ${revData.totalRevisions || 0}`;

        case "summarize_proposal":
          const propResponse = await fetch(
            `/api/proposals/${args.proposal_id}/summarize`,
            {
              method: "POST",
            }
          );
          if (!propResponse.ok)
            throw new Error("Failed to fetch proposal summary");
          const propData = await propResponse.json();
          return `Proposal Summary:\n\n${propData.summary}`;

        case "summarize_discussion":
          const discResponse = await fetch(
            `/api/discourse/topics/${args.topic_id}/summarize`,
            {
              method: "POST",
            }
          );
          if (!discResponse.ok)
            throw new Error("Failed to fetch discussion summary");
          const discData = await discResponse.json();
          return `Discussion Summary:\n\n${discData.summary}`;

        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (error: any) {
      return `Error executing ${toolName}: ${error.message}`;
    }
  };

  // Build context from proposal and replies
  const buildContext = () => {
    const stripHtml = (html: string) => {
      return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
    };

    let context = `# Proposal: ${proposalTitle}\n\n`;
    context += `Proposal ID: ${proposalId}\n`;
    context += `Author: @${proposalAuthor}\n\n`;
    context += `## Proposal Content:\n${stripHtml(proposalContent)}\n\n`;

    if (replies && replies.length > 0) {
      context += `## Discussion (${replies.length} replies):\n\n`;
      replies.forEach((reply) => {
        context += `Reply #${reply.post_number} by @${reply.username}:\n`;
        context += `${stripHtml(reply.cooked)}\n\n`;
      });
    }

    return context;
  };

  // Initialize with system message when expanded
  useEffect(() => {
    if (isExpanded && !isInitialized) {
      const context = buildContext();
      conversationHistoryRef.current = [
        {
          role: "system",
          content: `You are a helpful assistant that answers questions about a NEAR governance proposal and its discussion. Here is the context:

${context}

IMPORTANT INSTRUCTIONS:

1. You have access to specialized analysis tools. ALWAYS use these tools when relevant:
   - When asked about "changes", "edits", "modifications", "what changed", "revisions", or "updates" → USE summarize_revisions
   - When asked for a "summary", "overview", or "main points" → USE summarize_proposal
   - When asked about "discussion", "replies", "comments", or "what people are saying" → USE summarize_discussion

2. The context above does NOT include revision history. If user asks about changes/edits, you MUST use the summarize_revisions tool to get that information.

3. Respond in plain text only. Do not use markdown formatting like **bold**, *italic*, bullet points, tables, or headers. Write naturally as if speaking to someone.

4. If information is not in the context and no tool can help, clearly state that.`,
        },
      ];
      setIsInitialized(true);
    }
  }, [
    isExpanded,
    isInitialized,
    proposalTitle,
    proposalContent,
    proposalId,
    replies,
  ]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  };

  const addMessage = (
    content: string,
    role: "user" | "assistant",
    messageId?: string,
    toolCalls?: ToolCall[]
  ): Message => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      role,
      timestamp: new Date(),
      messageId,
      toolCalls,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const updateLastMessage = (
    content: string,
    messageId?: string,
    toolCalls?: ToolCall[]
  ) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
          messageId: messageId || updated[updated.length - 1].messageId,
          toolCalls: toolCalls || updated[updated.length - 1].toolCalls,
        };
      }
      return updated;
    });
  };

  const sendStreamingMessage = async () => {
    let fullContent = "";
    let messageId: string | undefined;
    let toolCalls: ToolCall[] = [];
    let currentToolCall: any = null;

    // Add empty assistant message for streaming
    addMessage("", "assistant");

    const requestBody = {
      model,
      messages: conversationHistoryRef.current,
      tools,
      tool_choice: "auto",
      stream: true,
    };

    console.log(
      "🔧 Sending request with tools:",
      tools.map((t) => t.function.name)
    );

    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          `API Error: ${response.status} - ${
            errorData.error || errorData.message || response.statusText
          }`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (!messageId && parsed.id) {
                messageId = parsed.id;
              }

              const delta = parsed.choices?.[0]?.delta;

              // Handle tool calls
              if (delta?.tool_calls) {
                console.log("🔧 Tool call detected:", delta.tool_calls);
                const toolCallDelta = delta.tool_calls[0];

                if (toolCallDelta.id) {
                  currentToolCall = {
                    id: toolCallDelta.id,
                    type: toolCallDelta.type || "function",
                    function: {
                      name: toolCallDelta.function?.name || "",
                      arguments: toolCallDelta.function?.arguments || "",
                    },
                  };
                  toolCalls.push(currentToolCall);
                } else if (
                  currentToolCall &&
                  toolCallDelta.function?.arguments
                ) {
                  currentToolCall.function.arguments +=
                    toolCallDelta.function.arguments;
                }
              }

              // Handle content
              const content = delta?.content;
              if (content) {
                fullContent += content;
                updateLastMessage(fullContent, messageId, toolCalls);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // If we have tool calls, execute them
      if (toolCalls.length > 0) {
        console.log("🔧 Executing tool calls:", toolCalls);
        updateLastMessage(
          fullContent || "Using analysis tools...",
          messageId,
          toolCalls
        );

        conversationHistoryRef.current.push({
          role: "assistant",
          content: fullContent || "", // Use empty string instead of null
          tool_calls: toolCalls,
        });

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeToolCall(toolCall.function.name, args);

          // Add tool result to conversation history
          conversationHistoryRef.current.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          });
        }

        // Get final response with tool results
        await sendStreamingMessage();
      } else {
        // No tool calls, just regular message
        conversationHistoryRef.current.push({
          role: "assistant",
          content: fullContent,
        });
      }
    } catch (error: any) {
      setMessages((prev) => prev.slice(0, -1)); // Remove empty message
      throw error;
    }
  };

  const handleSend = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    // Clear input
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Add user message
    addMessage(message, "user");
    conversationHistoryRef.current.push({ role: "user", content: message });

    setIsLoading(true);
    setError(null);

    try {
      await sendStreamingMessage();
    } catch (error: any) {
      setError(error.message || "Failed to get response");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clean up excessive spacing in text and strip any markdown formatting
  const cleanText = (content: string) => {
    return (
      content
        .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
        // Strip markdown formatting
        .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold **text**
        .replace(/\*([^*]+)\*/g, "$1") // Remove italic *text*
        .replace(/^#+\s+/gm, "") // Remove headers #
        .replace(/^[-*+]\s+/gm, "") // Remove bullet points
        .replace(/^\d+\.\s+/gm, "") // Remove numbered lists
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links [text](url) -> text
        .replace(/`([^`]+)`/g, "$1") // Remove inline code `text`
        .replace(/^>\s+/gm, "") // Remove blockquotes
        .replace(/\|/g, " ") // Remove table pipes
        .trim()
    );
  };

  return (
    <>
      <style jsx>{`
        .chatbot-container {
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .chatbot-header {
          padding: 1rem;
          background: #888888;
          color: white;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          flex-shrink: 0;
        }

        .chatbot-header:hover {
          opacity: 0.95;
        }

        .chatbot-title {
          font-weight: 600;
          font-size: 0.9375rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .chatbot-icon {
          font-size: 1.25rem;
        }

        .expand-icon {
          font-size: 1rem;
          transition: transform 0.3s;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .chatbot-body {
          display: flex;
          flex-direction: column;
          height: 0;
          overflow: hidden;
          transition: height 0.3s ease;
        }

        .chatbot-body.expanded {
          height: 500px;
        }

        .chat-messages {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          background: #f9fafb;
          min-height: 0;
        }

        .welcome-message {
          text-align: center;
          padding: 2rem 1rem;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .welcome-title {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .message {
          display: flex;
          margin-bottom: 1rem;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message.user {
          justify-content: flex-end;
        }

        .message-content {
          max-width: 80%;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          line-height: 1.5;
          word-wrap: break-word;
          white-space: pre-wrap;
          font-size: 0.875rem;
        }

        .message.user .message-content {
          background: #888888;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.assistant .message-content {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
        }

        .tool-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0.75rem 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          max-width: 60px;
        }

        .typing-dot {
          width: 6px;
          height: 6px;
          background: #667eea;
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }

        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%,
          60%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }

        .error-message {
          padding: 0.75rem;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 6px;
          margin: 0.5rem 1rem;
          font-size: 0.8125rem;
          border: 1px solid #fecaca;
          flex-shrink: 0;
        }

        .chat-input-area {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          background: white;
          flex-shrink: 0;
        }

        .input-wrapper {
          display: flex;
          gap: 0.5rem;
          align-items: flex-end;
        }

        .input-textarea {
          flex: 1;
          padding: 0.625rem 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
          min-height: 38px;
          max-height: 100px;
        }

        .input-textarea:focus {
          border-color: #667eea;
        }

        .input-textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f3f4f6;
        }

        .send-button {
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: #888888;
          color: white;
          min-width: 70px;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }

        .send-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      <div className="chatbot-container">
        <div
          className="chatbot-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="chatbot-title">Ask about this proposal</div>
          <div className={`expand-icon ${isExpanded ? "expanded" : ""}`}>▼</div>
        </div>

        <div className={`chatbot-body ${isExpanded ? "expanded" : ""}`}>
          <div className="chat-messages" ref={chatContainerRef}>
            {messages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-title">Ask me anything!</div>
                <div>
                  I can help you understand this proposal and its discussion. I
                  can also analyze revisions and provide detailed summaries.
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-content">
                    {cleanText(msg.content)}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="tool-indicator">
                        🔧 Using:{" "}
                        {msg.toolCalls.map((tc) => tc.function.name).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="message assistant">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="chat-input-area">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="input-textarea"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="send-button"
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
