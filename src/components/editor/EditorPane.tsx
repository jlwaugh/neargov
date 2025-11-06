import React from "react";

export function EditorPane({
  title,
  content,
  setTitle,
  setContent,
  disabled,
  renderedPreview,
  viewMode,
  onToggleView,
  showDiffHighlights,
  diffHtml,
  hasPendingChanges,
  onAcceptChanges,
  onRejectChanges,
}: {
  title: string;
  content: string;
  setTitle: (s: string) => void;
  setContent: (s: string) => void;
  disabled: boolean;
  renderedPreview: string;
  viewMode: "editor" | "preview";
  onToggleView: (mode: "editor" | "preview") => void;
  showDiffHighlights: boolean;
  diffHtml?: string;
  hasPendingChanges?: boolean;
  onAcceptChanges?: () => void;
  onRejectChanges?: () => void;
}) {
  return (
    <div>
      {/* Title Input */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#374151",
            marginBottom: "0.5rem",
          }}
        >
          Proposal Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          placeholder="Enter your proposal title…"
          className="input"
          style={{
            fontSize: "1rem",
            fontWeight: 600,
          }}
        />
      </div>

      {/* Diff Controls Banner - Show when there are pending changes */}
      {hasPendingChanges && showDiffHighlights && (
        <div
          style={{
            padding: "1rem",
            background: "#fff7ed",
            border: "2px solid #fb923c",
            borderRadius: "8px",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#9a3412",
                  marginBottom: "0.125rem",
                }}
              >
                AI Suggested Changes
              </div>
              <div style={{ fontSize: "0.75rem", color: "#92400e" }}>
                <span style={{ color: "#166534" }}>Green</span> = additions •{" "}
                <span style={{ color: "#991b1b" }}>Red</span> = removals
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={onRejectChanges}
              className="btn btn-ghost"
              style={{
                fontSize: "0.875rem",
                padding: "0.5rem 1rem",
              }}
            >
              ✕ Reject
            </button>
            <button
              onClick={onAcceptChanges}
              className="btn btn-primary"
              style={{
                fontSize: "0.875rem",
                padding: "0.5rem 1rem",
                background: "#0072ce",
              }}
            >
              ✓ Accept
            </button>
          </div>
        </div>
      )}

      {/* View Toggle Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <div className="segmented" role="tablist" aria-label="View mode">
          <button
            role="tab"
            aria-selected={viewMode === "editor"}
            className={`segmented-btn ${viewMode === "editor" ? "active" : ""}`}
            onClick={() => onToggleView("editor")}
          >
            Editor
          </button>
          <button
            role="tab"
            aria-selected={viewMode === "preview"}
            className={`segmented-btn ${
              viewMode === "preview" ? "active" : ""
            }`}
            onClick={() => onToggleView("preview")}
          >
            Preview
          </button>
        </div>

        <kbd
          style={{
            fontSize: "0.7rem",
            padding: "0.25rem 0.5rem",
          }}
        >
          ⌘/Ctrl + E to toggle
        </kbd>
      </div>

      {/* Editor View */}
      {viewMode === "editor" && (
        <div>
          {showDiffHighlights && diffHtml ? (
            /* Show diff in a read-only formatted view */
            <div
              style={{
                padding: "1rem",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                background: "#fafafa",
                minHeight: "400px",
                maxHeight: "640px",
                overflowY: "auto",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "0.875rem",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
              dangerouslySetInnerHTML={{ __html: diffHtml }}
            />
          ) : (
            /* Normal editable textarea */
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={disabled}
              placeholder="Write your proposal in Markdown…

Include:
• Objectives and goals
• Detailed budget breakdown
• Timeline with milestones
• Measurable KPIs"
              rows={24}
              className="textarea"
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "0.875rem",
                lineHeight: "1.6",
                width: "100%",
              }}
            />
          )}
        </div>
      )}

      {/* Preview View */}
      {viewMode === "preview" && (
        <div
          style={{
            padding: "1.25rem",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fafafa",
            minHeight: "400px",
            maxHeight: "640px",
            overflowY: "auto",
          }}
        >
          {title && (
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                marginBottom: "1rem",
                color: "#1a1a1a",
              }}
            >
              {title}
            </h1>
          )}
          {showDiffHighlights && diffHtml ? (
            <div
              style={{
                fontSize: "0.95rem",
                lineHeight: "1.6",
                color: "#374151",
              }}
              dangerouslySetInnerHTML={{ __html: diffHtml }}
            />
          ) : content ? (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: renderedPreview }}
            />
          ) : (
            <p
              style={{
                color: "#9ca3af",
                fontSize: "0.875rem",
                fontStyle: "italic",
              }}
            >
              Your markdown preview will appear here…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
