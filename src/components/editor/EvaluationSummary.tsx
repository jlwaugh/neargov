import React from "react";
import type { Evaluation } from "@/types/evaluation";

export function EvaluationSummary({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div
      style={{
        padding: "0.875rem",
        background: evaluation.overallPass ? "#f0fdf4" : "#fffbeb",
        border: evaluation.overallPass
          ? "1px solid #86efac"
          : "1px solid #fcd34d",
        borderRadius: "8px",
        marginTop: "0.75rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>
          {evaluation.overallPass ? "✓" : "⚠"}
        </span>
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: "700",
            color: evaluation.overallPass ? "#065f46" : "#92400e",
          }}
        >
          {evaluation.overallPass ? "Passes Screening" : "Needs Work"}
        </span>
      </div>
      <p
        style={{
          fontSize: "0.8rem",
          color: "#374151",
          lineHeight: "1.5",
          margin: 0,
        }}
      >
        {evaluation.summary}
      </p>
    </div>
  );
}
