import { useState } from "react";

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

export const ProposalScreener = () => {
  const [title, setTitle] = useState<string>("");
  const [proposal, setProposal] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string>("");

  const evaluateProposal = async () => {
    if (!title.trim()) {
      setError("Please enter a proposal title");
      return;
    }
    if (!proposal.trim()) {
      setError("Please enter a proposal");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/screen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, proposal }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `API request failed: ${response.status}`
        );
      }

      const data = await response.json();
      setResult(data.evaluation);
    } catch (err: any) {
      setError(err.message || "Failed to evaluate proposal");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="page-wrapper">
      <div className="container">
        <div className="card">
          <div className="screener-header text-center">
            <h1 className="page-title">AI Proposal Screener</h1>
            <p className="page-subtitle">
              <b>Private Governance Proposal Reviews</b>
            </p>
            <p className="page-subtitle">Built on NEAR AI Cloud</p>
          </div>

          <div className="form">
            <div className="input-group">
              <label className="label">Proposal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a clear, descriptive title"
                className="input"
              />
            </div>

            <div className="input-group">
              <label className="label">
                Proposal Content
                <span className="label-hint">
                  {" "}
                  — Include objectives, budget, timeline, and KPIs
                </span>
              </label>
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Paste your full proposal here..."
                rows={14}
                className="textarea textarea-code"
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠</span>
                <p className="alert-text">{error}</p>
              </div>
            )}

            <button
              onClick={evaluateProposal}
              disabled={loading}
              className="btn btn-primary btn-full"
            >
              {loading ? <>Evaluating proposal...</> : <>Screen Proposal</>}
            </button>
          </div>

          {result && (
            <div className="screener-results">
              <div
                className={`status-card ${
                  result.overallPass
                    ? "status-card-success"
                    : "status-card-warning"
                }`}
              >
                <div className="status-card-header">
                  <span className="status-icon">
                    {result.overallPass ? "✓" : "⚠"}
                  </span>
                  <h2 className="status-title">
                    {result.overallPass
                      ? "Ready for Submission"
                      : "Needs Improvement"}
                  </h2>
                </div>
                <p className="status-text">{result.summary}</p>
              </div>

              <div>
                <h3 className="section-title">Screening Criteria</h3>
                <div className="grid grid-auto" style={{ marginTop: "1rem" }}>
                  {(
                    Object.keys(criteriaLabels) as Array<
                      keyof typeof criteriaLabels
                    >
                  ).map((key) => {
                    const criterion = result[
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
                          <h4 className="info-card-title">
                            {criteriaLabels[key]}
                          </h4>
                        </div>
                        <p className="info-card-text">{criterion.reason}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="screener-alignment-card">
                <h3 className="screener-alignment-title">
                  NEAR Ecosystem Alignment
                </h3>
                <div className="screener-alignment-badge-container">
                  <span
                    className={`badge ${
                      result.alignment.score === "high"
                        ? "badge-success"
                        : result.alignment.score === "medium"
                        ? "badge-warning"
                        : "badge-error"
                    }`}
                  >
                    {result.alignment.score.toUpperCase()} ALIGNMENT
                  </span>
                </div>
                <p className="screener-alignment-reason">
                  {result.alignment.reason}
                </p>
              </div>

              {result.overallPass && (
                <div className="feature-card">
                  <div className="feature-icon">✓</div>
                  <div>
                    <h3 className="feature-title">AI Screened & Approved</h3>
                    <p className="feature-text">
                      This proposal has passed all automated quality criteria
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="footer">
          <p className="footer-text">
            AI screening supports both proposal authors and community reviewers.
            Results are advisory and independent of official governance
            processes.
          </p>
        </footer>
      </div>
    </div>
  );
};
