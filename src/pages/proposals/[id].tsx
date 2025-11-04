import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import VersionSelector from "@/components/VersionSelector";
import ProposalContent from "@/components/ProposalContent";
import { ScreeningBadge } from "@/components/ScreeningBadge";
import { ScreeningButton } from "@/components/ScreeningButton";
import { Markdown } from "@/components/Markdown";
import { useNear } from "@/hooks/useNear";
import type { Evaluation } from "@/types/evaluation";
import { reconstructRevisionContent } from "@/lib/revisionContentUtils";

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

interface Revision {
  version: number;
  created_at: string;
  username: string;
  edit_reason: string;
  body_changes?: {
    inline?: string;
    side_by_side?: string;
  };
  title_changes?: {
    inline?: string;
    side_by_side?: string;
  };
}

interface ScreeningData {
  evaluation: Evaluation;
  title: string;
  nearAccount: string;
  timestamp: string;
  revisionNumber: number;
}

interface SummaryResponse {
  success: boolean;
  summary: string;
  cached?: boolean;
  cacheAge?: number;
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
  const [showRevisions, setShowRevisions] = useState(false);

  // Version control state
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [showDiffHighlights, setShowDiffHighlights] = useState(false);
  const [versionContent, setVersionContent] = useState<string>("");
  const [versionDiffHtml, setVersionDiffHtml] = useState<string>("");

  // Summary states
  const [proposalSummary, setProposalSummary] = useState<string | null>(null);
  const [proposalSummaryLoading, setProposalSummaryLoading] = useState(false);
  const [revisionSummary, setRevisionSummary] = useState<string | null>(null);
  const [revisionSummaryLoading, setRevisionSummaryLoading] = useState(false);
  const [topicSummary, setTopicSummary] = useState<string | null>(null);
  const [topicSummaryLoading, setTopicSummaryLoading] = useState(false);
  const [replySummaries, setReplySummaries] = useState<Record<number, string>>(
    {}
  );
  const [replySummaryLoading, setReplySummaryLoading] = useState<
    Record<number, boolean>
  >({});

  // Get wallet and account from useNear hook
  const { wallet, signedAccountId } = useNear();

  useEffect(() => {
    if (id) {
      fetchProposal(id as string);
    }
  }, [id]);

  const fetchProposal = async (proposalId: string) => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch proposal");
      }

      const data = await response.json();
      setProposal(data);
      setVersionContent(data.content);

      const revisionsResponse = await fetch(
        `/api/proposals/${proposalId}/revisions`
      );

      if (revisionsResponse.ok) {
        const revisionsData = await revisionsResponse.json();
        const latestRevision = revisionsData.current_version || 1;
        setCurrentRevision(latestRevision);
        setSelectedVersion(latestRevision);

        if (revisionsData.revisions && revisionsData.revisions.length > 0) {
          setRevisions(revisionsData.revisions);

          const currentRevisionData = revisionsData.revisions.find(
            (r: Revision) => r.version === latestRevision
          );
          if (currentRevisionData?.body_changes?.inline) {
            setVersionDiffHtml(currentRevisionData.body_changes.inline);
          }
        }

        fetchScreening(proposalId, latestRevision);
      } else {
        setCurrentRevision(1);
        setSelectedVersion(1);
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

  const handleVersionChange = async (version: number) => {
    setSelectedVersion(version);
    setRevisionSummary(null);
    setShowDiffHighlights(false);

    if (version === currentRevision) {
      console.log("📄 Using current version");
      setVersionContent(proposal?.content || "");

      const latestRevision = revisions.find((r) => r.version === version);

      if (latestRevision && latestRevision.body_changes?.inline) {
        console.log("✅ Setting diff HTML for current version");
        setVersionDiffHtml(latestRevision.body_changes.inline);
      } else {
        console.log("⚠️ No inline diff for current version");
        setVersionDiffHtml("");
      }
    } else {
      // Historical version - reconstruct
      console.log("🔍 Reconstructing version:", version);

      try {
        const { content: reconstructedContent, title: reconstructedTitle } =
          reconstructRevisionContent(
            proposal?.content || "",
            proposal?.title || "",
            revisions,
            version
          );

        setVersionContent(reconstructedContent);

        // Get diff HTML for this version
        const revision = revisions.find((r) => r.version === version);
        if (revision && revision.body_changes?.inline) {
          console.log("✅ Setting diff HTML for historical version");
          setVersionDiffHtml(revision.body_changes.inline);
        } else {
          console.log("⚠️ No inline diff for this version");
          setVersionDiffHtml("");
        }
      } catch (error) {
        console.error("❌ Error reconstructing content:", error);
        setVersionContent(proposal?.content || "");
        setVersionDiffHtml("");
      }
    }

    // Update screening
    if (id) {
      fetchScreening(id as string, version);
    }
  };

  const fetchProposalSummary = async () => {
    if (!id) return;
    setProposalSummaryLoading(true);
    try {
      const response = await fetch(`/api/proposals/${id}/summarize`, {
        method: "POST",
      });
      if (response.ok) {
        const data: SummaryResponse = await response.json();
        setProposalSummary(data.summary);
      } else {
        console.error("Failed to fetch proposal summary");
      }
    } catch (error) {
      console.error("Error fetching proposal summary:", error);
    } finally {
      setProposalSummaryLoading(false);
    }
  };

  const fetchRevisionSummary = async () => {
    if (!id) return;

    setRevisionSummaryLoading(true);
    try {
      const response = await fetch(`/api/proposals/${id}/revisions/summarize`, {
        method: "POST",
      });
      if (response.ok) {
        const data: SummaryResponse = await response.json();
        setRevisionSummary(data.summary);
      } else {
        console.error("Failed to fetch revision summary");
      }
    } catch (error) {
      console.error("Error fetching revision summary:", error);
    } finally {
      setRevisionSummaryLoading(false);
    }
  };

  const fetchTopicSummary = async () => {
    if (!id) return;
    setTopicSummaryLoading(true);
    try {
      const response = await fetch(`/api/discourse/topics/${id}/summarize`, {
        method: "POST",
      });
      if (response.ok) {
        const data: SummaryResponse = await response.json();
        setTopicSummary(data.summary);
      } else {
        console.error("Failed to fetch topic summary");
      }
    } catch (error) {
      console.error("Error fetching topic summary:", error);
    } finally {
      setTopicSummaryLoading(false);
    }
  };

  const fetchReplySummary = async (replyId: number) => {
    setReplySummaryLoading((prev) => ({ ...prev, [replyId]: true }));
    try {
      const response = await fetch(
        `/api/discourse/replies/${replyId}/summarize`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        const data: SummaryResponse = await response.json();
        setReplySummaries((prev) => ({ ...prev, [replyId]: data.summary }));
      } else {
        console.error("Failed to fetch reply summary");
      }
    } catch (error) {
      console.error("Error fetching reply summary:", error);
    } finally {
      setReplySummaryLoading((prev) => ({ ...prev, [replyId]: false }));
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
        <div
          style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}
        >
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
        <div
          style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}
        >
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

            {/* Overall Pass/Fail - Top Right */}
            {screening && screening.revisionNumber === selectedVersion && (
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

            {/* Right side: Activity stats - Bottom Right */}
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
            height: "calc(100vh - 250px)",
          }}
        >
          {/* LEFT COLUMN */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
              height: "100%",
              overflowY: "auto",
              paddingRight: "0.5rem",
            }}
          >
            {/* Proposal Content */}
            <div className="card" style={{ position: "relative" }}>
              {/* Version Selector - conditionally rendered */}
              {showRevisions && (
                <VersionSelector
                  currentRevision={currentRevision}
                  selectedVersion={selectedVersion}
                  revisions={revisions}
                  onVersionChange={handleVersionChange}
                  showDiffHighlights={showDiffHighlights}
                  onToggleDiff={setShowDiffHighlights}
                  onSummarizeChanges={fetchRevisionSummary}
                  revisionSummary={revisionSummary}
                  revisionSummaryLoading={revisionSummaryLoading}
                  onHideSummary={() => setRevisionSummary(null)}
                  versionDiffHtml={versionDiffHtml}
                />
              )}

              {/* Proposal Content with integrated summary button and show revisions toggle */}
              <ProposalContent
                content={
                  showDiffHighlights && versionDiffHtml
                    ? versionDiffHtml
                    : versionContent || proposal?.content || ""
                }
                isExpanded={isContentExpanded}
                onToggleExpand={setIsContentExpanded}
                proposalSummary={proposalSummary}
                proposalSummaryLoading={proposalSummaryLoading}
                onFetchProposalSummary={fetchProposalSummary}
                onHideProposalSummary={() => setProposalSummary(null)}
                showRevisions={showRevisions}
                onToggleRevisions={() => setShowRevisions(!showRevisions)}
                hasRevisions={revisions.length > 1}
                revisionCount={revisions.length}
              />

              {/* Keep existing table styles */}
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

            {/* Discussion Section */}
            {proposal.replies && proposal.replies.length > 0 && (
              <div className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>
                    Replies ({proposal.replies.length})
                  </h2>

                  {/* Topic Summary Button */}
                  {!topicSummary ? (
                    <button
                      onClick={fetchTopicSummary}
                      disabled={topicSummaryLoading}
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#059669",
                        background: "white",
                        border: "1px solid #059669",
                        borderRadius: "6px",
                        cursor: topicSummaryLoading ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        opacity: topicSummaryLoading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!topicSummaryLoading) {
                          e.currentTarget.style.background = "#f0fdf4";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                      }}
                    >
                      {topicSummaryLoading
                        ? "Analyzing..."
                        : "Summarize Discussion"}
                    </button>
                  ) : null}
                </div>

                {/* Topic Summary Display */}
                {topicSummary && (
                  <div
                    style={{
                      padding: "1rem",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "6px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#047857",
                        }}
                      >
                        Discussion Summary
                      </div>
                      <button
                        onClick={() => setTopicSummary(null)}
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.25rem 0.5rem",
                        }}
                      >
                        Hide
                      </button>
                    </div>
                    <Markdown
                      content={topicSummary}
                      style={{
                        fontSize: "0.875rem",
                        lineHeight: "1.6",
                        color: "#374151",
                      }}
                    />
                  </div>
                )}

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
                          marginBottom: "0.75rem",
                        }}
                        dangerouslySetInnerHTML={{ __html: reply.cooked }}
                      />

                      {/* Reply Summary Button */}
                      {!replySummaries[reply.id] ? (
                        <button
                          onClick={() => fetchReplySummary(reply.id)}
                          disabled={replySummaryLoading[reply.id]}
                          style={{
                            padding: "0.375rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "#ea580c",
                            background: "white",
                            border: "1px solid #ea580c",
                            borderRadius: "4px",
                            cursor: replySummaryLoading[reply.id]
                              ? "not-allowed"
                              : "pointer",
                            transition: "all 0.2s",
                            opacity: replySummaryLoading[reply.id] ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!replySummaryLoading[reply.id]) {
                              e.currentTarget.style.background = "#fff7ed";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                          }}
                        >
                          {replySummaryLoading[reply.id]
                            ? "Summarizing..."
                            : "Summarize"}
                        </button>
                      ) : (
                        <div
                          style={{
                            padding: "0.75rem",
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: "4px",
                            marginTop: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                color: "#c2410c",
                              }}
                            >
                              Summary
                            </div>
                            <button
                              onClick={() => {
                                setReplySummaries((prev) => {
                                  const newSummaries = { ...prev };
                                  delete newSummaries[reply.id];
                                  return newSummaries;
                                });
                              }}
                              style={{
                                fontSize: "0.75rem",
                                color: "#6b7280",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "0.25rem 0.5rem",
                              }}
                            >
                              Hide
                            </button>
                          </div>
                          <Markdown
                            content={replySummaries[reply.id]}
                            style={{
                              fontSize: "0.75rem",
                              lineHeight: "1.6",
                              color: "#374151",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              height: "100%",
              overflowY: "auto",
              paddingRight: "0.5rem",
            }}
          >
            {/* AI Screening Badge or Button */}
            {screeningChecked &&
              screening &&
              screening.revisionNumber === selectedVersion && (
                <ScreeningBadge screening={screening} />
              )}

            {screeningChecked &&
              (!screening || screening.revisionNumber !== selectedVersion) &&
              wallet &&
              signedAccountId && (
                <ScreeningButton
                  topicId={id as string}
                  title={proposal.title}
                  content={versionContent || proposal.content}
                  nearAccount={signedAccountId}
                  wallet={wallet}
                  revisionNumber={selectedVersion}
                  onScreeningComplete={() =>
                    fetchScreening(id as string, selectedVersion)
                  }
                />
              )}

            {screeningChecked &&
              (!screening || screening.revisionNumber !== selectedVersion) &&
              (!wallet || !signedAccountId) && (
                <div className="card">
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    💡 Connect your NEAR wallet to screen this proposal with AI
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
