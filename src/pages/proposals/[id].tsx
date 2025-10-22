import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import VersionHistory from "@/components/VersionHistory";

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

export default function ProposalDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            <Link href="/proposals" className="btn btn-secondary">
              ← Back to Proposals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const daysSinceActivity = getDaysSinceActivity(proposal.last_posted_at);

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="card">
          {/* Back Button */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Link
              href="/proposals"
              className="btn btn-secondary"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #d1d5db",
                color: "#374151",
              }}
            >
              ← Back to Proposals
            </Link>
          </div>

          {/* Title */}
          <h1 className="page-title" style={{ marginBottom: "2rem" }}>
            {proposal.title}
          </h1>

          {/* Metadata Section */}
          <div
            className="card"
            style={{ backgroundColor: "#f9fafb", marginBottom: "2rem" }}
          >
            <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
              Proposal Information
            </h2>

            <div style={{ display: "grid", gap: "1rem" }}>
              {/* Author */}
              <div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                  }}
                >
                  Proposal Author
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "500" }}>
                  <span>@{proposal.username}</span>
                  {proposal.near_wallet && (
                    <span
                      style={{
                        marginLeft: "1rem",
                        color: "#6b7280",
                        fontSize: "0.875rem",
                      }}
                    >
                      NEAR: {proposal.near_wallet}
                    </span>
                  )}
                </div>
              </div>

              {/* Date/Time */}
              <div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                  }}
                >
                  Proposal Date & Time
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "500" }}>
                  {new Date(proposal.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(proposal.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* Discourse Link */}
              <div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                  }}
                >
                  Discourse Thread
                </div>
                <a
                  href={`https://discuss.near.vote/t/${proposal.topic_slug}/${proposal.topic_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline" }}
                >
                  View on Discourse →
                </a>
              </div>

              {/* Discourse Stats */}
              <div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "0.5rem",
                  }}
                >
                  Discussion Activity
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "2rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "1.5rem", fontWeight: "700" }}>
                      {formatNumber(proposal.reply_count)}
                    </span>
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        color: "#6b7280",
                        fontSize: "0.875rem",
                      }}
                    >
                      {proposal.reply_count === 1 ? "Reply" : "Replies"}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "1.5rem", fontWeight: "700" }}>
                      {formatNumber(proposal.views)}
                    </span>
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        color: "#6b7280",
                        fontSize: "0.875rem",
                      }}
                    >
                      {proposal.views === 1 ? "View" : "Views"}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "1.5rem", fontWeight: "700" }}>
                      {daysSinceActivity}
                    </span>
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        color: "#6b7280",
                        fontSize: "0.875rem",
                      }}
                    >
                      {daysSinceActivity === 1 ? "Day" : "Days"} Since Activity
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proposal Content */}
          <div className="card">
            <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
              Proposal Content
            </h2>
            <div
              style={{
                lineHeight: "1.8",
                color: "#374151",
              }}
              dangerouslySetInnerHTML={{ __html: proposal.content }}
            />
          </div>

          {/* Version History */}
          <div style={{ marginTop: "2rem" }}>
            <VersionHistory proposalId={id as string} />
          </div>

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
      </div>
    </div>
  );
}
