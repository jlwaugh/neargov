import { useState } from "react";
import type { Evaluation } from "@/types/evaluation";
import { ScreeningBadge } from "@/components/ScreeningBadge";

interface Revision {
  version: number;
  created_at: string;
  username: string;
  edit_reason: string;
  body_changes?: {
    inline?: string;
    side_by_side?: string;
    side_by_side_markdown?: string;
  };
  title_changes?: {
    inline?: string;
    side_by_side?: string;
  };
}

interface VersionHistoryProps {
  proposalId: string;
  title: string;
  content: string;
  nearAccount: string;
  wallet: any;
}

export default function VersionHistory({
  proposalId,
  title,
  content,
  nearAccount,
  wallet,
}: VersionHistoryProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [screeningRevision, setScreeningRevision] = useState<number | null>(
    null
  );
  const [screeningResults, setScreeningResults] = useState<
    Record<
      number,
      {
        evaluation: Evaluation;
        nearAccount: string;
        timestamp: string;
      }
    >
  >({});
  const [screeningErrors, setScreeningErrors] = useState<
    Record<number, string>
  >({});

  const fetchRevisions = async () => {
    if (revisions.length > 0) {
      setShowHistory(!showHistory);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/discourse/proposals/${proposalId}/revisions`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch version history");
      }

      const data = await response.json();
      const fetchedRevisions = data.revisions.reverse() || []; // Reverse to show latest first
      setRevisions(fetchedRevisions);

      // Fetch existing screenings for all revisions (including version 1)
      await fetchExistingScreenings([
        1,
        ...fetchedRevisions.map((r: Revision) => r.version),
      ]);

      setShowHistory(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingScreenings = async (versionNumbers: number[]) => {
    const newResults: Record<
      number,
      {
        evaluation: Evaluation;
        nearAccount: string;
        timestamp: string;
      }
    > = {};

    for (const version of versionNumbers) {
      try {
        const response = await fetch(
          `/api/getAnalysis/${proposalId}?revisionNumber=${version}`
        );

        if (response.ok) {
          const data = await response.json();
          newResults[version] = {
            evaluation: data.evaluation,
            nearAccount: data.nearAccount,
            timestamp: data.timestamp,
          };
        }
        // Silently ignore 404s (no screening for this revision)
      } catch (err) {
        console.error(
          `Failed to fetch screening for revision ${version}:`,
          err
        );
      }
    }

    setScreeningResults(newResults);
  };

  const stripHtml = (html: string): string => {
    if (typeof document !== "undefined") {
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent || div.innerText || "";
    }
    return html.replace(/<[^>]*>/g, "");
  };

  const handleScreenRevision = async (revisionNumber: number) => {
    setScreeningRevision(revisionNumber);
    setScreeningErrors((prev) => ({ ...prev, [revisionNumber]: "" }));

    try {
      // Check if wallet is available for authentication
      if (!wallet) {
        throw new Error(
          "Wallet not connected. Please connect your NEAR wallet to screen proposals."
        );
      }

      if (!nearAccount) {
        throw new Error("NEAR account not found. Please connect your wallet.");
      }

      // Generate auth token for saving screening
      const { sign } = await import("near-sign-verify");
      const { base58 } = await import("@scure/base");

      const walletWrapper = {
        signMessage: async (params: any) => {
          const result = await wallet.signMessage(params);
          const signatureBytes = Uint8Array.from(atob(result.signature), (c) =>
            c.charCodeAt(0)
          );
          const base58Signature = base58.encode(signatureBytes);
          return { ...result, signature: `ed25519:${base58Signature}` };
        },
      };

      const authToken = await sign(
        `Evaluate proposal ${proposalId} revision ${revisionNumber}`,
        {
          signer: walletWrapper,
          recipient: "social.near",
        }
      );

      // Save screening with authentication and specific revision
      const saveResponse = await fetch(`/api/saveAnalysis/${proposalId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title,
          content: stripHtml(content),
          evaluatorAccount: nearAccount,
          revisionNumber, // Pass the specific revision number
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        if (saveResponse.status === 409) {
          setScreeningErrors((prev) => ({
            ...prev,
            [revisionNumber]: "This revision has already been evaluated.",
          }));
        } else if (saveResponse.status === 429) {
          setScreeningErrors((prev) => ({
            ...prev,
            [revisionNumber]:
              saveData.message ||
              "Rate limit exceeded. Please try again later.",
          }));
        } else {
          throw new Error(
            saveData.error || `Failed to save screening: ${saveResponse.status}`
          );
        }
        return;
      }

      // Store the evaluation result
      setScreeningResults((prev) => ({
        ...prev,
        [revisionNumber]: {
          evaluation: saveData.evaluation,
          nearAccount: nearAccount,
          timestamp: new Date().toISOString(),
        },
      }));

      console.log(`✓ Screening completed for revision ${revisionNumber}!`);
    } catch (err: any) {
      setScreeningErrors((prev) => ({
        ...prev,
        [revisionNumber]: err.message || "Failed to screen revision",
      }));
      console.error("Screening error:", err);
    } finally {
      setScreeningRevision(null);
    }
  };

  const renderScreeningButton = (revisionNumber: number) => {
    const isScreening = screeningRevision === revisionNumber;
    const screeningData = screeningResults[revisionNumber];
    const error = screeningErrors[revisionNumber];

    if (screeningData) {
      // Use ScreeningBadge component for consistent UI
      return (
        <div style={{ marginTop: "0.75rem" }}>
          <ScreeningBadge
            screening={{
              evaluation: screeningData.evaluation,
              title: title,
              nearAccount: screeningData.nearAccount,
              timestamp: screeningData.timestamp,
            }}
          />
        </div>
      );
    }

    return (
      <div style={{ marginTop: "0.75rem" }}>
        {error && (
          <div
            style={{
              padding: "0.5rem",
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            {error}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleScreenRevision(revisionNumber);
          }}
          disabled={isScreening || !wallet || !nearAccount}
          className="btn btn-primary"
          style={{
            fontSize: "0.875rem",
            padding: "0.5rem 1rem",
            opacity: isScreening || !wallet || !nearAccount ? 0.6 : 1,
            cursor:
              isScreening || !wallet || !nearAccount
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isScreening
            ? "Screening..."
            : wallet && nearAccount
            ? "Screen This Revision"
            : "Connect Wallet to Screen"}
        </button>
      </div>
    );
  };

  const renderDiff = (revision: Revision) => {
    if (!revision.body_changes && !revision.title_changes) {
      return <p style={{ color: "#6b7280" }}>No changes available</p>;
    }

    return (
      <div>
        {revision.title_changes?.inline && (
          <div style={{ marginBottom: "1rem" }}>
            <strong style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Title Changes:
            </strong>
            <div
              style={{ marginTop: "0.5rem" }}
              dangerouslySetInnerHTML={{
                __html: revision.title_changes.inline,
              }}
            />
          </div>
        )}
        {revision.body_changes?.inline && (
          <div>
            <strong style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Content Changes:
            </strong>
            <div
              style={{
                marginTop: "0.5rem",
                maxHeight: "400px",
                overflow: "auto",
                padding: "0.5rem",
                backgroundColor: "#f9fafb",
                borderRadius: "0.5rem",
              }}
              dangerouslySetInnerHTML={{ __html: revision.body_changes.inline }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Version History</h2>
        <button
          onClick={fetchRevisions}
          className="btn btn-secondary"
          disabled={loading}
          style={{
            backgroundColor: "transparent",
            border: "1px solid #d1d5db",
            color: "#374151",
          }}
        >
          {loading
            ? "Loading..."
            : showHistory
            ? "Hide History"
            : "Show History"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          {error}
        </div>
      )}

      {showHistory && revisions.length === 0 && !loading && (
        <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
          No edit history available for this proposal.
        </p>
      )}

      {showHistory && revisions.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {revisions.map((revision, index) => (
              <div
                key={revision.version}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  backgroundColor:
                    selectedVersion === revision.version ? "#f0f9ff" : "white",
                }}
              >
                <div
                  style={{
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() => {
                    console.log("Clicked version:", revision.version);
                    setSelectedVersion(
                      selectedVersion === revision.version
                        ? null
                        : revision.version
                    );
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "1rem" }}>
                        Revision {revisions.length - index} of{" "}
                        {revisions.length}
                      </strong>
                      <span
                        style={{
                          marginLeft: "1rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        by @{revision.username}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {new Date(revision.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}{" "}
                      at{" "}
                      {new Date(revision.created_at).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>

                  {revision.edit_reason && (
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        marginBottom: "0.75rem",
                        fontStyle: "italic",
                      }}
                    >
                      Reason: {revision.edit_reason}
                    </div>
                  )}

                  {selectedVersion === revision.version && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      {renderDiff(revision)}
                    </div>
                  )}

                  {selectedVersion !== revision.version && (
                    <div style={{ fontSize: "0.875rem", color: "#2563eb" }}>
                      Click to view changes →
                    </div>
                  )}
                </div>

                {/* Screening button for this revision */}
                {renderScreeningButton(revision.version)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
