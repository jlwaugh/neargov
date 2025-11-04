import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import { Markdown } from "@/components/Markdown";

interface ProposalContentProps {
  content: string;
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  proposalSummary: string | null;
  proposalSummaryLoading: boolean;
  onFetchProposalSummary: () => void;
  onHideProposalSummary: () => void;
  showRevisions: boolean;
  onToggleRevisions: () => void;
  hasRevisions: boolean;
  revisionCount: number;
}

export default function ProposalContent({
  content,
  isExpanded,
  onToggleExpand,
  proposalSummary,
  proposalSummaryLoading,
  onFetchProposalSummary,
  onHideProposalSummary,
  showRevisions,
  onToggleRevisions,
  hasRevisions,
  revisionCount,
}: ProposalContentProps) {
  // Initialize markdown-it with proper options and sanitize output
  const renderedContent = useMemo(() => {
    const md = new MarkdownIt({
      html: true, // Enable HTML tags in source
      linkify: true, // Auto-convert URLs to links
      typographer: true, // Enable smartquotes and other typographic replacements
    });

    const rendered = md.render(content);
    return DOMPurify.sanitize(rendered);
  }, [content]);

  return (
    <>
      {/* Top Controls - Summary and Revisions buttons side by side */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
        }}
      >
        {/* Left side - Proposal Summary Button */}
        <div style={{ flex: "0 1 auto" }}>
          {!proposalSummary ? (
            <button
              onClick={onFetchProposalSummary}
              disabled={proposalSummaryLoading}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#2563eb",
                background: "white",
                border: "1px solid #2563eb",
                borderRadius: "6px",
                cursor: proposalSummaryLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: proposalSummaryLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!proposalSummaryLoading) {
                  e.currentTarget.style.background = "#eff6ff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
              }}
            >
              {proposalSummaryLoading
                ? "⏳ Generating..."
                : "✨ Summarize Proposal"}
            </button>
          ) : null}
        </div>

        {/* Right side - Show Revisions Button */}
        {hasRevisions && (
          <div style={{ flex: "0 0 auto" }}>
            <button
              onClick={onToggleRevisions}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#6b7280",
                background: "white",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
              }}
            >
              {showRevisions ? "Hide" : "Show"} Revisions ({revisionCount})
            </button>
          </div>
        )}
      </div>

      {/* Proposal Summary Display */}
      {proposalSummary && (
        <div
          style={{
            padding: "1rem",
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#0369a1",
              }}
            >
              AI Summary
            </div>
            <button
              onClick={onHideProposalSummary}
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem 0.5rem",
              }}
            >
              Hide
            </button>
          </div>
          <Markdown
            content={proposalSummary}
            style={{
              fontSize: "0.875rem",
              lineHeight: "1.6",
              color: "#374151",
            }}
          />
        </div>
      )}

      {/* Content wrapper */}
      <div
        style={{
          maxHeight: isExpanded ? "none" : "400px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            lineHeight: "1.8",
            color: "#374151",
          }}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {/* Gradient overlay when collapsed */}
        {!isExpanded && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "100px",
              background: "linear-gradient(to bottom, transparent, white)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Read More/Hide button */}
      {!isExpanded ? (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            onClick={() => onToggleExpand(true)}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#374151",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
          >
            Read More
          </button>
        </div>
      ) : (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => onToggleExpand(false)}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#374151",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
          >
            Hide
          </button>
        </div>
      )}

      {/* CSS for diff highlighting and markdown elements */}
      <style jsx>{`
        :global(ins) {
          background-color: #d1fae5;
          text-decoration: none;
          padding: 0 2px;
          border-radius: 2px;
        }
        :global(del) {
          background-color: #fee2e2;
          text-decoration: line-through;
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>
    </>
  );
}
