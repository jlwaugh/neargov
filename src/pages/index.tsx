import { useState } from "react";
import { useNear } from "@/hooks/useNear";
import { ProposalForm } from "../components/ProposalForm";
import { ScreeningResults } from "../components/ScreeningResults";
import { ConnectDiscourse } from "../components/ConnectDiscourse";
import { PublishButton } from "../components/PublishButton";
import { WalletStatus } from "../components/WalletStatus";

export default function Main() {
  const { signedAccountId, wallet, loading: walletLoading } = useNear();

  const [title, setTitle] = useState("");
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [linkedAccount, setLinkedAccount] = useState<any>(null);

  const evaluateProposal = async () => {
    if (!title.trim() || !proposal.trim()) {
      setError("Please enter both title and proposal");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="card">
          <div className="screener-header text-center">
            <h1 className="page-title">AI Proposal Screener</h1>
            <p className="page-subtitle">
              Pre-screen your NEAR governance proposal with AI evaluation, then
              publish directly to Discourse
            </p>
          </div>

          <WalletStatus
            signedAccountId={signedAccountId}
            loading={walletLoading}
          />

          <ProposalForm
            title={title}
            proposal={proposal}
            onTitleChange={setTitle}
            onProposalChange={setProposal}
            onSubmit={evaluateProposal}
            loading={loading}
          />

          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠</span>
              <p className="alert-text">{error}</p>
            </div>
          )}

          {result && (
            <>
              <ScreeningResults evaluation={result} />

              {result.overallPass && signedAccountId && wallet && (
                <>
                  {!linkedAccount && (
                    <ConnectDiscourse
                      signedAccountId={signedAccountId}
                      wallet={wallet}
                      onLinked={setLinkedAccount}
                      onError={setError}
                    />
                  )}

                  {linkedAccount && (
                    <PublishButton
                      wallet={wallet}
                      title={title}
                      content={proposal}
                      linkedAccount={linkedAccount}
                      onPublished={() => {}}
                      onError={setError}
                    />
                  )}
                </>
              )}
            </>
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
}
