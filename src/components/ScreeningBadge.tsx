import { useState } from "react";
import type { Evaluation } from "@/types/evaluation";

interface ScreeningBadgeProps {
  screening: {
    evaluation: Evaluation;
    title: string;
    nearAccount: string;
    timestamp: string;
    revisionNumber: number;
  };
}

interface CriterionDetail {
  key: string;
  label: string;
  icon: string;
}

const CRITERIA: CriterionDetail[] = [
  { key: "alignment", label: "Alignment Score", icon: "" },
  { key: "complete", label: "Complete", icon: "" },
  { key: "legible", label: "Legible", icon: "" },
  { key: "consistent", label: "Consistent", icon: "" },
  { key: "genuine", label: "Genuine", icon: "" },
  { key: "compliant", label: "Compliant", icon: "" },
  { key: "justified", label: "Justified", icon: "" },
];

export function ScreeningBadge({ screening }: ScreeningBadgeProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const getCriterionResult = (key: string) => {
    const result = screening.evaluation[key as keyof Evaluation];

    if (key === "alignment") {
      // Return alignment as a special criterion-like object
      const alignment = result as {
        score: "high" | "medium" | "low";
        reason: string;
      };
      return {
        pass: alignment.score === "high",
        reason: alignment.reason,
        alignmentScore: alignment.score,
      };
    }

    // Filter out non-criterion fields
    if (key === "overallPass" || key === "summary") {
      return null;
    }

    return result as { pass: boolean; reason: string };
  };

  const getPassFailStatus = (
    criterion: { pass: boolean; reason: string; alignmentScore?: string } | null
  ) => {
    if (!criterion) return null;

    // Special handling for alignment
    if (criterion.alignmentScore) {
      if (criterion.alignmentScore === "high") return "pass";
      if (criterion.alignmentScore === "medium") return "medium";
      return "fail";
    }

    return criterion.pass ? "pass" : "fail";
  };

  const countResults = () => {
    let points = 0;
    let failed = 0;

    CRITERIA.forEach((criterion) => {
      const result = getCriterionResult(criterion.key);
      const status = getPassFailStatus(result);

      if (criterion.key === "alignment") {
        // Alignment scores: high = 2, medium = 1, low = 0
        if (status === "pass") points += 2; // high
        else if (status === "medium") points += 1; // medium
        else failed++; // low
      } else {
        if (status === "pass") points++;
        else if (status === "fail") failed++;
      }
    });

    return { points, failed, total: 8 };
  };

  const { points, failed, total } = countResults();

  return (
    <div className="card">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              margin: 0,
            }}
          >
            Screened by <strong>{screening.nearAccount}</strong>
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#9ca3af",
            }}
          >
            {new Date(screening.timestamp).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • Revision {screening.revisionNumber}
          </p>
        </div>

        <div
          style={{
            padding: "1rem",
            marginBottom: "0.5rem",
            display: "flex",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.888rem",
                textAlign: "right",
                margin: 0,
              }}
            >
              Score:
            </p>
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 555,
                textAlign: "right",
                margin: 0,
              }}
            >
              {points}/{total}
            </p>
          </div>
        </div>
      </div>
      {/* Individual Criteria - Accordion Style */}
      <div className="screening-accordion">
        {CRITERIA.map((criterion) => {
          const result = getCriterionResult(criterion.key);
          const status = getPassFailStatus(result);
          const isAlignment = criterion.key === "alignment";
          const isOpen = openKey === criterion.key;

          if (!result) return null;

          // Special styling for alignment (temperature gauge)
          const alignmentGradient = isAlignment
            ? status === "pass"
              ? "linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)" // Green gradient for high
              : status === "medium"
              ? "linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)" // Yellow gradient for medium
              : "linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)" // Red gradient for low
            : "white";

          return (
            <div
              key={criterion.key}
              style={{
                border: isAlignment ? "2px solid" : "1px solid #e5e7eb",
                borderColor: isAlignment
                  ? status === "pass"
                    ? "#10b981"
                    : status === "medium"
                    ? "#f59e0b"
                    : "#ef4444"
                  : "#e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: isAlignment ? "0 4px 6px rgba(0,0,0,0.1)" : "none",
                transform: isAlignment ? "scale(1.02)" : "scale(1)",
                marginBottom: "0.75rem",
                transition: "all 0.2s ease",
              }}
            >
              {/* Criterion Header (Button) */}
              <button
                onClick={() => setOpenKey(isOpen ? null : criterion.key)}
                style={{
                  width: "100%",
                  padding: isAlignment ? "1rem 1.25rem" : "0.875rem 1rem",
                  background: alignmentGradient,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isAlignment) {
                    e.currentTarget.style.background = "#fafafa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAlignment) {
                    e.currentTarget.style.background = "white";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: isAlignment ? "700" : "600",
                      fontSize: isAlignment ? "1rem" : "0.9rem",
                      color: isAlignment ? "#1a1a1a" : "inherit",
                    }}
                  >
                    {criterion.label}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {/* Pass/Fail Badge */}
                  <span
                    style={{
                      padding: isAlignment
                        ? "0.375rem 1rem"
                        : "0.25rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: isAlignment ? "0.8rem" : "0.75rem",
                      fontWeight: "700",
                      background:
                        status === "pass"
                          ? isAlignment
                            ? "#065f46"
                            : "#d1fae5"
                          : status === "medium"
                          ? isAlignment
                            ? "#92400e"
                            : "#fef3c7"
                          : isAlignment
                          ? "#991b1b"
                          : "#fee2e2",
                      color:
                        status === "pass"
                          ? isAlignment
                            ? "#ffffff"
                            : "#065f46"
                          : status === "medium"
                          ? isAlignment
                            ? "#ffffff"
                            : "#92400e"
                          : isAlignment
                          ? "#ffffff"
                          : "#991b1b",
                      boxShadow: isAlignment
                        ? "0 2px 4px rgba(0,0,0,0.1)"
                        : "none",
                    }}
                  >
                    {status === "pass"
                      ? isAlignment
                        ? "HIGH"
                        : "PASS"
                      : status === "medium"
                      ? "MEDIUM"
                      : isAlignment
                      ? "LOW"
                      : "FAIL"}
                  </span>
                  {/* Expand/Collapse Icon */}
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: isAlignment ? "#1a1a1a" : "#9ca3af",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      display: "inline-block",
                    }}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Expanded Details */}
              {isOpen && (
                <div
                  style={{
                    padding: "1rem",
                    borderTop: isAlignment ? "2px solid" : "1px solid #e5e7eb",
                    borderTopColor: isAlignment
                      ? status === "pass"
                        ? "#10b981"
                        : status === "medium"
                        ? "#f59e0b"
                        : "#ef4444"
                      : "#e5e7eb",
                    background: "white",
                    animation: "slideDown 0.2s ease-out",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.875rem",
                      lineHeight: "1.6",
                      color: "#374151",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {result.reason || "No details provided."}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
