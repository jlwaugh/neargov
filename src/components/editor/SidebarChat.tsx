import React from "react";
import type { MessageRole } from "@/types/agui-events";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
}
interface ToolCallState {
  id: string;
  name: string;
  args: string;
  status: "in_progress" | "completed";
}

export function SidebarChat({
  currentStep,
  messages,
  currentMessage,
  activeToolCalls,
  isRunning,
  suggestions,
  inputMessage,
  setInputMessage,
  sendMessage,
  evaluationSlot,
}: {
  currentStep: string | null;
  messages: Message[];
  currentMessage: { id: string; content: string } | null;
  activeToolCalls: Map<string, ToolCallState>;
  isRunning: boolean;
  suggestions: string[];
  inputMessage: string;
  setInputMessage: (s: string) => void;
  sendMessage: (s: string) => void;
  evaluationSlot?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          marginBottom: "1rem",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "1rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.125rem",
            margin: "0 0 0.25rem 0",
            fontWeight: "600",
          }}
        >
          Proposal Assistant
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
          Screen proposals and suggest improvements
        </p>

        {currentStep && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "0.75rem",
              padding: "0.375rem 0.75rem",
              background: "#eff6ff",
              color: "#1d4ed8",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "600",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--near-blue)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            {currentStep}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginBottom: "1rem",
          paddingRight: "0.5rem",
        }}
      >
        {messages.length === 0 ? (
          <div>
            <p
              style={{
                marginBottom: "0.75rem",
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "var(--text-primary)",
              }}
            >
              Try a quick action:
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={isRunning}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    padding: "0.75rem",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: "0.75rem",
                  background: m.role === "user" ? "#eff6ff" : "#f9fafb",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginBottom: "0.375rem",
                    fontWeight: "600",
                  }}
                >
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: "1.6",
                    color: "#374151",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {currentMessage && (
              <div
                style={{
                  padding: "0.75rem",
                  background: "#f9fafb",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginBottom: "0.375rem",
                    fontWeight: "600",
                  }}
                >
                  Assistant
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: "1.6",
                    color: "#374151",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {currentMessage.content}
                </div>
              </div>
            )}

            {Array.from(activeToolCalls.values()).map((tc) => (
              <div
                key={tc.id}
                style={{
                  padding: "0.75rem",
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#92400e",
                    marginBottom: "0.375rem",
                    fontWeight: "600",
                  }}
                >
                  Tool Call
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    color: "#78350f",
                    marginBottom: "0.375rem",
                  }}
                >
                  {tc.name}({tc.args.substring(0, 50)}
                  {tc.args.length > 50 ? "…" : ""})
                </div>
                <div style={{ fontSize: "0.75rem", color: "#b45309" }}>
                  {tc.status === "in_progress"
                    ? "⏳ In progress…"
                    : "✓ Completed"}
                </div>
              </div>
            ))}

            {isRunning && !currentMessage && activeToolCalls.size === 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                }}
              >
                <span
                  className="spinner"
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid #d1d5db",
                    borderTopColor: "var(--near-blue)",
                    borderRadius: "50%",
                  }}
                />
                Thinking…
              </div>
            )}
          </>
        )}

        {evaluationSlot}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderTop: "1px solid var(--border-color)",
          paddingTop: "1rem",
        }}
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(inputMessage);
            }
          }}
          placeholder="Ask me to screen or improve…"
          className="input"
          disabled={isRunning}
          style={{ flex: 1, fontSize: "0.875rem" }}
        />
        <button
          onClick={() => sendMessage(inputMessage)}
          disabled={isRunning || !inputMessage.trim()}
          className="btn btn-primary"
          style={{ padding: "0.75rem 1.25rem" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
