import React, { useMemo } from "react";
import type MarkdownIt from "markdown-it";
import type { Evaluation } from "@/types/evaluation";
import { diffPartialText } from "@/lib/diff";

export function ConfirmModal({
  onConfirm,
  onReject,
  evaluation,
  beforeTitle,
  beforeContent,
  afterTitle,
  afterContent,
  md,
}: {
  onConfirm: () => void;
  onReject: () => void;
  evaluation: Evaluation | null;
  beforeTitle: string;
  beforeContent: string;
  afterTitle: string;
  afterContent: string;
  md: MarkdownIt;
}) {
  const renderedAfter = useMemo(
    () => md.render(afterContent || ""),
    [md, afterContent]
  );

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2 className="section-title" style={{ marginBottom: "1rem" }}>
          Review AI Changes
        </h2>

        {evaluation && (
          <div
            className={`info-card ${
              evaluation.overallPass ? "info-card-success" : "info-card-warning"
            }`}
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: evaluation.overallPass ? "#f0fdf4" : "#fffbeb",
              border: evaluation.overallPass
                ? "1px solid #86efac"
                : "1px solid #fcd34d",
            }}
          >
            <div className="info-card-header">
              <span
                className={`info-card-icon ${
                  evaluation.overallPass
                    ? "info-card-icon-success"
                    : "info-card-icon-error"
                }`}
              >
                {evaluation.overallPass ? "✓" : "⚠"}
              </span>
              <h3 className="info-card-title">
                {evaluation.overallPass
                  ? "Passes Screening"
                  : "Still Needs Work"}
              </h3>
            </div>
            <p className="info-card-text" style={{ marginTop: "0.5rem" }}>
              {evaluation.summary}
            </p>
          </div>
        )}

        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            marginBottom: "1.5rem",
          }}
        >
          Review the changes below.{" "}
          <em style={{ color: "#166534" }}>Green italic text</em> shows
          additions, <s style={{ color: "#991b1b" }}>red strikethrough</s> shows
          removals.
        </p>

        {/* Title Changes */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label className="label" style={{ marginBottom: "0.5rem" }}>
            Title Changes
          </label>
          <div
            className="card"
            style={{
              padding: "0.875rem",
              background: "#f9fafb",
              fontSize: "0.9rem",
              lineHeight: "1.6",
            }}
            dangerouslySetInnerHTML={{
              __html: diffPartialText(beforeTitle || "", afterTitle || ""),
            }}
          />
        </div>

        {/* Content Changes (Diff) */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label className="label" style={{ marginBottom: "0.5rem" }}>
            Content Changes (Diff)
          </label>
          <div
            className="card scroll-box"
            style={{
              padding: "0.875rem",
              background: "#f9fafb",
              fontSize: "0.875rem",
              lineHeight: "1.6",
              maxHeight: "300px",
              overflowY: "auto",
            }}
            dangerouslySetInnerHTML={{
              __html: diffPartialText(beforeContent || "", afterContent || ""),
            }}
          />
        </div>

        {/* Rendered Preview */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label className="label" style={{ marginBottom: "0.5rem" }}>
            Updated Content (Preview)
          </label>
          <div
            className="card scroll-box"
            style={{
              padding: "1.25rem",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            <h1 className="markdown-title">{afterTitle || "Untitled"}</h1>
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: renderedAfter }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <button
            onClick={onReject}
            className="btn btn-ghost"
            type="button"
            style={{ flex: 1 }}
          >
            Reject Changes
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary"
            type="button"
            style={{ flex: 1 }}
          >
            Accept Changes
          </button>
        </div>
      </div>
    </div>
  );
}
