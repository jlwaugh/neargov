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
      {/* Sticky Hide button at top when expanded */}
      {isExpanded && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "white",
            padding: "0.75rem 0",
            marginBottom: "1rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => onToggleExpand(false)}
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#374151",
              background: "white",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f9fafb";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
            }}
          >
            ↑ Hide Full Content
          </button>
        </div>
      )}

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Content</h2>
          <button
            onClick={() => {
              if (proposalSummary) {
                onHideProposalSummary();
              } else {
                onFetchProposalSummary();
              }
            }}
            disabled={proposalSummaryLoading}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: proposalSummary ? "#6b7280" : "white",
              background: proposalSummary ? "white" : "#4B4BFD",
              border: proposalSummary
                ? "1px solid #d1d5db"
                : "1px solid #4B4BFD",
              borderRadius: "5px",
              cursor: proposalSummaryLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: proposalSummaryLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!proposalSummaryLoading) {
                e.currentTarget.style.background = proposalSummary
                  ? "#f9fafb"
                  : "#7272FF";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = proposalSummary
                ? "white"
                : "#4B4BFD";
            }}
          >
            {proposalSummaryLoading
              ? "Generating..."
              : proposalSummary
              ? "Hide Summary"
              : "Summarize"}
          </button>
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
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#0369a1",
              marginBottom: "0.5rem",
            }}
          >
            AI Summary
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
          maxHeight: isExpanded ? "none" : "600px",
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

      {/* Read More button (only shown when collapsed) */}
      {!isExpanded && (
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
            Read More ↓
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
