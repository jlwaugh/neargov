import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  messageId?: string;
}

interface ChatbotProps {
  model?: string;
  className?: string;
  placeholder?: string;
  welcomeMessage?: string;
}

export const Chatbot = ({
  model = "openai/gpt-oss-120b",
  className = "",
  placeholder = "Ask me anything...",
  welcomeMessage = "Welcome to NEAR AI Assistant. How can I help you today?",
}: ChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationHistoryRef = useRef<
    Array<{ role: string; content: string }>
  >([]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    setIsInitialized(true);
  }, []);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const addMessage = (
    content: string,
    role: "user" | "assistant",
    messageId?: string
  ): Message => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      role,
      timestamp: new Date(),
      messageId,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const updateLastMessage = (content: string, messageId?: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
          messageId: messageId || updated[updated.length - 1].messageId,
        };
      }
      return updated;
    });
  };

  const sendStreamingMessage = async (userMessage: string) => {
    let fullContent = "";
    let messageId: string | undefined;

    // Add empty assistant message for streaming
    addMessage("", "assistant");

    const requestBody = {
      model,
      messages: conversationHistoryRef.current,
      stream: true,
    };

    console.log("Sending request:", requestBody);

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
        console.error("API Error:", response.status, errorData);
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

              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                updateLastMessage(fullContent, messageId);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      conversationHistoryRef.current.push({
        role: "assistant",
        content: fullContent,
      });
    } catch (error: any) {
      console.error("Error:", error);
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
      await sendStreamingMessage(message);
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

  const clearChat = () => {
    if (window.confirm("Clear chat history?")) {
      setMessages([]);
      conversationHistoryRef.current = [];
      setError(null);
    }
  };

  return (
    <>
      <style jsx>{`
        .chat-messages-container {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          min-height: 400px;
          max-height: 500px;
          overflow-y: auto;
        }

        .welcome-message {
          text-align: center;
          padding: 3rem 1.5rem;
          color: #6b7280;
        }

        .welcome-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.5rem 0;
        }

        .welcome-text {
          margin: 0;
          line-height: 1.6;
        }

        .message {
          display: flex;
          margin-bottom: 1.5rem;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
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
          max-width: 70%;
          padding: 1rem 1.25rem;
          border-radius: 18px;
          line-height: 1.6;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        .message.user .message-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.assistant .message-content {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
        }

        .verification-badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          margin-left: 8px;
          vertical-align: middle;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 1rem 1.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          max-width: 70px;
        }

        .typing-dot {
          width: 8px;
          height: 8px;
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
            transform: translateY(-10px);
          }
        }

        .error-message {
          padding: 0.75rem 1rem;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          border: 1px solid #fecaca;
        }

        .input-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .input-wrapper {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
        }

        .input-textarea {
          flex: 1;
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-family: inherit;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
          min-height: 44px;
          max-height: 150px;
        }

        .input-textarea:focus {
          border-color: #667eea;
        }

        .input-textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn {
          padding: 0.75rem 1.25rem;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: #dc3545;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        }

        .chat-messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .chat-messages-container::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .chat-messages-container::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        .chat-messages-container::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        @media (max-width: 768px) {
          .chat-messages-container {
            max-height: 400px;
          }

          .message-content {
            max-width: 85%;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="chat-messages-container" ref={chatContainerRef}>
        {messages.length === 0 && isInitialized && (
          <div className="welcome-message">
            <h2 className="welcome-title">Welcome</h2>
            <p className="welcome-text">{welcomeMessage}</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.content}
              {msg.messageId && msg.role === "assistant" && (
                <span className="verification-badge">Verifiable</span>
              )}
            </div>
          </div>
        ))}

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

      <div className="input-container">
        {error && <div className="error-message">{error}</div>}

        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="input-textarea"
            rows={1}
          />
          <button
            onClick={clearChat}
            disabled={isLoading || messages.length === 0}
            className="btn btn-secondary"
          >
            Clear
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="btn btn-primary"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </>
  );
};
