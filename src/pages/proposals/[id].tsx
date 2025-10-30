import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import VersionHistory from "@/components/VersionHistory";
import { ScreeningBadge } from "@/components/ScreeningBadge";
import { ScreeningButton } from "@/components/ScreeningButton";
import { DiscussionSummary } from "@/components/DiscussionSummary";
import { useNear } from "@/hooks/useNear";
import type { Evaluation } from "@/types/evaluation";

interface ProposalDetail {
  id: number;
  title: string;
  content: string;
  created_at: string;
  username: string;
  topic_id: number;
  topic_slug: string;
  reply_count: number;
  views: number;
  last_posted_at: string;
  like_count?: number;
  near_wallet?: string;
  category_id?: number;
  replies?: Reply[];
}

interface Reply {
  id: number;
  username: string;
  created_at: string;
  cooked: string;
  post_number: number;
}

interface ScreeningData {
  evaluation: Evaluation;
  title: string;
  nearAccount: string;
  timestamp: string;
  revisionNumber: number;
}

export default function ProposalDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [screening, setScreening] = useState<ScreeningData | null>(null);
  const [screeningChecked, setScreeningChecked] = useState(false);
  const [currentRevision, setCurrentRevision] = useState<number>(1);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Get wallet and account from useNear hook
  const { wallet, signedAccountId } = useNear();

  useEffect(() => {
    if (id) {
      fetchProposal(id as string);
    }
  }, [id]);

  const fetchProposal = async (proposalId: string) => {
    try {
      const response = await fetch(`/api/discourse/proposals/${proposalId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch proposal");
      }

      const data = await response.json();
      setProposal(data);

      // Fetch current revision number from Discourse
      const revisionsResponse = await fetch(
        `/api/discourse/proposals/${proposalId}/revisions`
      );
      if (revisionsResponse.ok) {
        const revisionsData = await revisionsResponse.json();
        // Use current_version from the API response
        const latestRevision = revisionsData.current_version || 1;
        setCurrentRevision(latestRevision);

        // Now fetch screening for the current revision
        fetchScreening(proposalId, latestRevision);
      } else {
        // Fallback to revision 1 if we can't get revisions
        setCurrentRevision(1);
        fetchScreening(proposalId, 1);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchScreening = async (topicId: string, revisionNumber: number) => {
    try {
      // Fetch screening for the specific revision
      const response = await fetch(
        `/api/getAnalysis/${topicId}?revisionNumber=${revisionNumber}`
      );

      if (response.status === 404) {
        // No screening exists for this revision
        setScreening(null);
      } else if (response.ok) {
        const data = await response.json();
        setScreening(data);
      } else {
        console.error("Unexpected error fetching screening:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch screening:", error);
    } finally {
      setScreeningChecked(true);
    }
  };

  const getDaysSinceActivity = (lastPostedAt: string) => {
    const now = new Date();
    const lastActivity = new Date(lastPostedAt);
    const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="container">
          <div className="card">
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <p>Loading proposal...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="page-wrapper">
        <div className="container">
          <div className="card">
            <div className="alert alert-error">
              <span className="alert-icon">⚠</span>
              <p className="alert-text">{error || "Proposal not found"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const daysSinceActivity = getDaysSinceActivity(proposal.last_posted_at);

  return (
    <div className="page-wrapper">
      <div
        style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}
      >
        {/* Header: Title and Metadata - FULL WIDTH */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.75rem",
            }}
          >
            <h1 className="page-title" style={{ margin: 0, fontSize: "2rem" }}>
              {proposal.title}
            </h1>

            {/* Overall Pass/Fail */}
            {screening && screening.revisionNumber === currentRevision && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexShrink: 0,
                  marginLeft: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    fontWeight: "600",
                  }}
                >
                  {screening.evaluation.overallPass ? "Pass" : "Fail"}
                </div>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: screening.evaluation.overallPass
                      ? "#d1fae5"
                      : "#fee2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: screening.evaluation.overallPass
                      ? "#065f46"
                      : "#991b1b",
                  }}
                >
                  {screening.evaluation.overallPass ? "✓" : "✕"}
                </div>
              </div>
            )}
          </div>

          {/* Compact metadata row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            {/* Left side: Author info */}
            <div>
              <strong style={{ color: "#374151" }}>@{proposal.username}</strong>
              {proposal.near_wallet && (
                <span style={{ marginLeft: "0.75rem" }}>
                  • {proposal.near_wallet}
                </span>
              )}
              <span style={{ marginLeft: "0.75rem" }}>
                •{" "}
                {new Date(proposal.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span style={{ marginLeft: "0.75rem" }}>
                •{" "}
                <a
                  href={`https://discuss.near.vote/t/${proposal.topic_slug}/${proposal.topic_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "none" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.textDecoration = "underline")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.textDecoration = "none")
                  }
                >
                  View on Discourse →
                </a>
              </span>
            </div>

            {/* Right side: Activity stats */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontWeight: "600", color: "#374151" }}>
                  {formatNumber(proposal.reply_count)}
                </span>{" "}
                💬
              </div>
              <div>
                <span style={{ fontWeight: "600", color: "#374151" }}>
                  {formatNumber(proposal.views)}
                </span>{" "}
                👁
              </div>
              <div>
                <span style={{ fontWeight: "600", color: "#374151" }}>
                  {daysSinceActivity}d
                </span>{" "}
                ago
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* LEFT COLUMN - Main Content (scrollable) */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {/* Proposal Content - Collapsible */}
            <div className="card" style={{ position: "relative" }}>
              {/* Content wrapper with max height when collapsed */}
              <div
                style={{
                  maxHeight: isContentExpanded ? "none" : "400px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    lineHeight: "1.8",
                    color: "#374151",
                  }}
                  dangerouslySetInnerHTML={{ __html: proposal.content }}
                />

                {/* Gradient overlay when collapsed */}
                {!isContentExpanded && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "100px",
                      background:
                        "linear-gradient(to bottom, transparent, white)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>

              {/* Read More button (inline when collapsed) */}
              {!isContentExpanded && (
                <div
                  style={{
                    marginTop: "1rem",
                    textAlign: "center",
                  }}
                >
                  <button
                    onClick={() => setIsContentExpanded(true)}
                    style={{
                      padding: "0.75rem 2rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#374151",
                      background: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e5e7eb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f3f4f6";
                    }}
                  >
                    Read More
                  </button>
                </div>
              )}

              <style jsx>{`
                .card :global(table) {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1rem 0;
                  font-size: 0.875rem;
                }
                .card :global(table th) {
                  background-color: #f3f4f6;
                  padding: 0.75rem;
                  text-align: left;
                  font-weight: 600;
                  border: 1px solid #d1d5db;
                }
                .card :global(table td) {
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                }
                .card :global(table tr:nth-child(even)) {
                  background-color: #f9fafb;
                }
                .card :global(a) {
                  color: #2563eb;
                  text-decoration: underline;
                }
                .card :global(a:hover) {
                  color: #1d4ed8;
                }
              `}</style>
            </div>

            {/* Hide button (fixed to viewport when expanded) */}
            {isContentExpanded && (
              <div
                style={{
                  position: "fixed",
                  bottom: "20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 1000,
                }}
              >
                <button
                  onClick={() => setIsContentExpanded(false)}
                  style={{
                    padding: "0.75rem 2rem",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#374151",
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow:
                      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e5e7eb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f3f4f6";
                  }}
                >
                  Hide
                </button>
              </div>
            )}

            {/* Version History */}
            <VersionHistory
              proposalId={id as string}
              title={proposal.title}
              content={proposal.content}
              nearAccount={signedAccountId || ""}
              wallet={wallet}
            />

            {/* Replies Section */}
            {proposal.replies && proposal.replies.length > 0 && (
              <div className="card">
                <h2 style={{ fontSize: "1.125rem", marginBottom: "1.5rem" }}>
                  Replies ({proposal.replies.length})
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  {proposal.replies.map((reply) => (
                    <div
                      key={reply.id}
                      style={{
                        padding: "1rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.5rem",
                        borderLeft: "3px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.75rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#374151" }}>
                            @{reply.username}
                          </strong>
                          <span style={{ marginLeft: "0.5rem" }}>
                            #{reply.post_number}
                          </span>
                        </div>
                        <div>
                          {new Date(reply.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}{" "}
                          at{" "}
                          {new Date(reply.created_at).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          lineHeight: "1.6",
                          color: "#374151",
                        }}
                        dangerouslySetInnerHTML={{ __html: reply.cooked }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Sidebar (sticky, scrollable) */}
          <div
            style={{
              position: "sticky",
              top: "1rem",
              maxHeight: "calc(100vh - 2rem)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {/* AI Screening Badge or Button */}
            {screeningChecked &&
              screening &&
              screening.revisionNumber === currentRevision && (
                <ScreeningBadge screening={screening} />
              )}

            {screeningChecked &&
              (!screening || screening.revisionNumber !== currentRevision) &&
              wallet &&
              signedAccountId && (
                <ScreeningButton
                  topicId={id as string}
                  title={proposal.title}
                  content={proposal.content}
                  nearAccount={signedAccountId}
                  wallet={wallet}
                  revisionNumber={currentRevision}
                  onScreeningComplete={() =>
                    fetchScreening(id as string, currentRevision)
                  }
                />
              )}

            {screeningChecked &&
              (!screening || screening.revisionNumber !== currentRevision) &&
              (!wallet || !signedAccountId) && (
                <div className="card">
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    💡 Connect your NEAR wallet to screen this proposal with AI
                  </p>
                </div>
              )}

            {/* Discussion Summary - Only show if there are replies */}
            {proposal.reply_count > 0 && (
              <DiscussionSummary
                proposalId={id as string}
                replyCount={proposal.reply_count}
              />
            )}

            {/* Future: Copilot component can go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
