import { useState, useRef, useEffect } from "react";

interface CompactMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
}

interface NEARChatWidgetProps {
  apiKey?: string;
  model?: string;
  position?: "bottom-right" | "bottom-left";
}

export const NEARChatWidget = ({
  apiKey = process.env.NEXT_PUBLIC_NEARAI_API_KEY || "",
  model = "openai/gpt-oss-120b",
  position = "bottom-right",
}: NEARChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CompactMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<
    Array<{ role: string; content: string }>
  >([]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (
    content: string,
    role: "user" | "assistant"
  ): CompactMessage => {
    const newMessage: CompactMessage = {
      id: Date.now().toString(),
      content,
      role,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const updateLastMessage = (content: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
        };
      }
      return updated;
    });
  };

  const sendMessage = async (userMessage: string) => {
    let fullContent = "";
    addMessage("", "assistant");

    try {
      const response = await fetch(
        "https://cloud-api.near.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: conversationHistoryRef.current,
            stream: true,
          }),
        }
      );

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

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
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                updateLastMessage(fullContent);
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
      setMessages((prev) => prev.slice(0, -1));
      addMessage(
        "Sorry, I encountered an error. Please try again.",
        "assistant"
      );
    }
  };

  const handleSend = async () => {
    const message = inputValue.trim();
    if (!message || isLoading || !apiKey) return;

    setInputValue("");
    addMessage(message, "user");
    conversationHistoryRef.current.push({ role: "user", content: message });

    setIsLoading(true);
    await sendMessage(message);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const positionStyles =
    position === "bottom-right"
      ? { bottom: "20px", right: "20px" }
      : { bottom: "20px", left: "20px" };

  return (
    <>
      <style jsx>{`
        .chat-widget-container {
          position: fixed;
          z-index: 1000;
        }

        .chat-toggle-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          transition: transform 0.2s;
        }

        .chat-toggle-btn:hover {
          transform: scale(1.05);
        }

        .chat-window {
          position: absolute;
          bottom: 80px;
          ${position === "bottom-right" ? "right: 0" : "left: 0"};
          width: 380px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chat-header {
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          background: #f8f9fa;
        }

        .chat-message {
          margin-bottom: 0.75rem;
          display: flex;
        }

        .chat-message.user {
          justify-content: flex-end;
        }

        .message-bubble {
          max-width: 75%;
          padding: 0.625rem 0.875rem;
          border-radius: 12px;
          font-size: 0.875rem;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .chat-message.user .message-bubble {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-message.assistant .message-bubble {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
        }

        .chat-input-container {
          padding: 0.75rem;
          background: white;
          border-top: 1px solid #e5e7eb;
          border-radius: 0 0 12px 12px;
        }

        .chat-input-wrapper {
          display: flex;
          gap: 0.5rem;
        }

        .chat-input {
          flex: 1;
          padding: 0.625rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          outline: none;
        }

        .chat-input:focus {
          border-color: #667eea;
        }

        .send-btn {
          padding: 0.625rem 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          background: #5568d3;
        }

        .send-btn:disabled {
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
          background: #888;
          border-radius: 3px;
        }

        @media (max-width: 480px) {
          .chat-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 100px);
          }
        }
      `}</style>

      <div className="chat-widget-container" style={positionStyles}>
        {isOpen && (
          <div className="chat-window">
            <div className="chat-header">
              <h3 className="chat-title">AI Assistant</h3>
              <button onClick={() => setIsOpen(false)} className="close-btn">
                ×
              </button>
            </div>

            <div className="chat-messages" ref={chatContainerRef}>
              {messages.length === 0 && (
                <div className="chat-message assistant">
                  <div className="message-bubble">
                    Hi! I can help you with NEAR governance and proposals. What
                    would you like to know?
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <div className="message-bubble">{msg.content}</div>
                </div>
              ))}
            </div>

            <div className="chat-input-container">
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="chat-input"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="send-btn"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => setIsOpen(!isOpen)} className="chat-toggle-btn">
          {isOpen ? "×" : "?"}
        </button>
      </div>
    </>
  );
};
