import { useState } from "react";

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
}

export default function VersionHistory({ proposalId }: VersionHistoryProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

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
      setRevisions(data.revisions.reverse() || []); // Reverse to show latest first
      setShowHistory(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
                      Revision {revisions.length - index} of {revisions.length}
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
                    {new Date(revision.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(revision.created_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
