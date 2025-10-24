import { useState, useEffect } from "react";
import type { Evaluation } from "@/types/evaluation";

interface ScreeningBadgeProps {
  topicId: string;
}

export const ScreeningBadge = ({ topicId }: ScreeningBadgeProps) => {
  const [screening, setScreening] = useState<{
    evaluation: Evaluation;
    title: string;
    nearAccount: string;
    timestamp: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchScreeningResults();
  }, [topicId]);

  const fetchScreeningResults = async () => {
    try {
      const response = await fetch(`/api/getAnalysis/${topicId}`);

      if (response.ok) {
        const data = await response.json();
        setScreening(data);
      }
    } catch (error) {
      console.log("No screening results available");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !screening) {
    return null;
  }

  const { evaluation, nearAccount, timestamp } = screening;
  const passed = evaluation.overallPass;

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              fontSize: "2rem",
              width: "50px",
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: passed ? "#00ec97" : "#ef4444",
              color: passed ? "#000000" : "#ffffff",
              borderRadius: "50%",
              fontWeight: "700",
            }}
          >
            {passed ? "✓" : "✗"}
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>
              {passed ? "AI-Screened Proposal" : "Screening Failed"}
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                margin: "0.25rem 0 0 0",
              }}
            >
              {passed ? "Pre-approved by NEAR AI" : "Did not pass screening"} •
              Evaluated by <strong>{nearAccount}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn btn-secondary"
          style={{
            backgroundColor: "transparent",
            border: "1px solid #d1d5db",
            color: "#374151",
            fontSize: "0.875rem",
          }}
        >
          {showDetails ? "Hide Details" : "View Screening"}
        </button>
      </div>

      {showDetails && (
        <div style={{ marginTop: "1.5rem" }}>
          {/* Summary */}
          <div
            className={`status-card ${
              passed ? "status-card-success" : "status-card-error"
            }`}
            style={{ marginBottom: "1.5rem" }}
          >
            <div className="status-card-header">
              <span className="status-icon">{passed ? "✓" : "✗"}</span>
              <h2 className="status-title">
                {passed ? "Passed All Criteria" : "Failed Screening"}
              </h2>
            </div>
            <p className="status-text">{evaluation.summary}</p>
          </div>

          {/* Screening Criteria */}
          <h4 className="section-title" style={{ marginBottom: "1rem" }}>
            Screening Criteria
          </h4>
          <div className="grid grid-auto" style={{ marginBottom: "1.5rem" }}>
            {Object.entries({
              complete: "Complete",
              legible: "Legible",
              consistent: "Consistent",
              genuine: "Genuine",
              compliant: "Compliant",
              justified: "Justified",
            }).map(([key, label]) => {
              const criterion = evaluation[
                key as keyof Omit<
                  Evaluation,
                  "alignment" | "overallPass" | "summary"
                >
              ] as { pass: boolean; reason: string };
              return (
                <div key={key} className="info-card">
                  <div className="info-card-header">
                    <span
                      className={`info-card-icon ${
                        criterion.pass
                          ? "info-card-icon-success"
                          : "info-card-icon-error"
                      }`}
                    >
                      {criterion.pass ? "✓" : "✗"}
                    </span>
                    <h4 className="info-card-title">{label}</h4>
                  </div>
                  <p className="info-card-text">{criterion.reason}</p>
                </div>
              );
            })}
          </div>

          {/* Alignment */}
          <div className="screener-alignment-card">
            <h4 className="screener-alignment-title">
              NEAR Ecosystem Alignment
            </h4>
            <div className="screener-alignment-badge-container">
              <span
                className={`badge ${
                  evaluation.alignment.score === "high"
                    ? "badge-success"
                    : evaluation.alignment.score === "medium"
                    ? "badge-warning"
                    : "badge-error"
                }`}
              >
                {evaluation.alignment.score.toUpperCase()} ALIGNMENT
              </span>
            </div>
            <p className="screener-alignment-reason">
              {evaluation.alignment.reason}
            </p>
          </div>

          {/* Timestamp */}
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "#f9fafb",
              borderRadius: "8px",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            Screened on{" "}
            {new Date(timestamp).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            at{" "}
            {new Date(timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      )}
    </div>
  );
};
