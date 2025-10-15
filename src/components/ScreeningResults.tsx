interface EvaluationCriterion {
  pass: boolean;
  reason: string;
}

interface Alignment {
  score: "high" | "medium" | "low";
  reason: string;
}

interface Evaluation {
  complete: EvaluationCriterion;
  legible: EvaluationCriterion;
  consistent: EvaluationCriterion;
  genuine: EvaluationCriterion;
  compliant: EvaluationCriterion;
  justified: EvaluationCriterion;
  alignment: Alignment;
  overallPass: boolean;
  summary: string;
}

interface ScreeningResultsProps {
  evaluation: Evaluation;
}

export const ScreeningResults = ({ evaluation }: ScreeningResultsProps) => {
  const criteriaLabels: Record<
    keyof Omit<Evaluation, "alignment" | "overallPass" | "summary">,
    string
  > = {
    complete: "Complete",
    legible: "Legible",
    consistent: "Consistent",
    genuine: "Genuine",
    compliant: "Compliant",
    justified: "Justified",
  };

  return (
    <div className="screener-results">
      <div
        className={`status-card ${
          evaluation.overallPass ? "status-card-success" : "status-card-warning"
        }`}
      >
        <div className="status-card-header">
          <span className="status-icon">
            {evaluation.overallPass ? "✓" : "⚠"}
          </span>
          <h2 className="status-title">
            {evaluation.overallPass
              ? "Ready for Submission"
              : "Needs Improvement"}
          </h2>
        </div>
        <p className="status-text">{evaluation.summary}</p>
      </div>

      <div>
        <h3 className="section-title">Screening Criteria</h3>
        <div className="grid grid-auto" style={{ marginTop: "1rem" }}>
          {(
            Object.keys(criteriaLabels) as Array<keyof typeof criteriaLabels>
          ).map((key) => {
            const criterion = evaluation[
              key as keyof Evaluation
            ] as EvaluationCriterion;
            return (
              <div key={String(key)} className="info-card">
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
                  <h4 className="info-card-title">{criteriaLabels[key]}</h4>
                </div>
                <p className="info-card-text">{criterion.reason}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="screener-alignment-card">
        <h3 className="screener-alignment-title">NEAR Ecosystem Alignment</h3>
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

      {evaluation.overallPass && (
        <div className="feature-card">
          <div className="feature-icon">✓</div>
          <div>
            <h3 className="feature-title">AI Screened & Approved</h3>
            <p className="feature-text">
              Your proposal is ready to publish to Discourse
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
