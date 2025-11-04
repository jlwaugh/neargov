import { useState, useMemo } from "react";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

interface DiscussionSummaryProps {
  proposalId: string;
  replyCount: number;
}

export function DiscussionSummary({
  proposalId,
  replyCount,
}: DiscussionSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  // Initialize markdown-it
  const md = useMemo(() => {
    return new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }, []);

  const renderedSummary = useMemo(() => {
    if (!summary) return "";
    const rendered = md.render(summary);
    return DOMPurify.sanitize(rendered);
  }, [summary, md]);

  const generateSummary = async () => {
    if (summary) {
      // Toggle visibility if already generated
      setShowSummary(!showSummary);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/discourse/topics/${proposalId}/summarize`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate summary");
      }

      const data = await response.json();
      setSummary(data.summary);
      setShowSummary(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate summary");
      console.error("Summary error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: summary && showSummary ? "1.5rem" : "0",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.125rem", margin: 0 }}>
            Discussion Summary
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginTop: "0.25rem",
            }}
          >
            AI-generated summary of {replyCount}{" "}
            {replyCount === 1 ? "reply" : "replies"}
          </p>
        </div>

        <button
          onClick={generateSummary}
          disabled={loading}
          className="btn btn-primary"
          style={{
            fontSize: "0.875rem",
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "Generating..."
            : summary
            ? showSummary
              ? "Hide Summary"
              : "Show Summary"
            : "Generate Summary"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "0.5rem",
            marginTop: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {summary && showSummary && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1.5rem",
            backgroundColor: "#f9fafb",
            borderRadius: "0.5rem",
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <div
            style={{
              lineHeight: "1.8",
              color: "#374151",
            }}
            dangerouslySetInnerHTML={{ __html: renderedSummary }}
          />

          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid #e5e7eb",
              fontSize: "0.75rem",
              color: "#6b7280",
            }}
          >
            This is an AI-generated summary. Read the full discussion for
            complete context.
          </div>
        </div>
      )}
    </div>
  );
}
