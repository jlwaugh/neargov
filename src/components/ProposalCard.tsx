import Link from "next/link";

interface ProposalCardProps {
  id: number;
  title: string;
  excerpt?: string;
  created_at: string;
  username: string;
  topic_id: number;
  topic_slug: string;
  reply_count?: number;
  views?: number;
  last_posted_at?: string;
  near_wallet?: string;
}

export default function ProposalCard({
  id,
  title,
  excerpt,
  created_at,
  username,
  topic_id,
  topic_slug,
  reply_count = 0,
  views = 0,
  last_posted_at,
  near_wallet,
}: ProposalCardProps) {
  const getDaysSinceActivity = (lastPostedAt?: string) => {
    if (!lastPostedAt) return null;
    const now = new Date();
    const lastActivity = new Date(lastPostedAt);
    const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const daysSinceActivity = getDaysSinceActivity(last_posted_at);

  return (
    <div className="card">
      {/* Proposal Title */}
      <h3
        style={{
          marginBottom: "0.5rem",
          fontSize: "1.25rem",
          fontWeight: "600",
        }}
      >
        {title}
      </h3>

      {/* Author Information */}
      <div
        style={{
          marginBottom: "1rem",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}
      >
        <div style={{ marginBottom: "0.25rem" }}>
          <strong>Author:</strong> @{username}
          {near_wallet && (
            <span style={{ marginLeft: "0.5rem" }}>| NEAR: {near_wallet}</span>
          )}
        </div>
        <div>
          <strong>Posted:</strong>{" "}
          {new Date(created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          at{" "}
          {new Date(created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Excerpt - Already cleaned by API */}
      {excerpt && (
        <p
          style={{
            marginBottom: "1rem",
            color: "#4b5563",
            lineHeight: "1.6",
          }}
        >
          {excerpt}
        </p>
      )}

      {/* Discourse Metadata Stats */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginBottom: "1rem",
          padding: "0.75rem",
          backgroundColor: "#f9fafb",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <span style={{ fontSize: "1rem" }}>💬</span>
          <span>
            <strong>{formatNumber(reply_count)}</strong>{" "}
            {reply_count === 1 ? "reply" : "replies"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <span style={{ fontSize: "1rem" }}>👁</span>
          <span>
            <strong>{formatNumber(views)}</strong>{" "}
            {views === 1 ? "view" : "views"}
          </span>
        </div>

        {daysSinceActivity !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span style={{ fontSize: "1rem" }}>🕐</span>
            <span>
              <strong>{daysSinceActivity}</strong>{" "}
              {daysSinceActivity === 1 ? "day" : "days"} since activity
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <Link href={`/proposals/${topic_id}`} className="btn btn-primary">
          View Details
        </Link>

        <a
          href={`https://discuss.near.vote/t/${topic_slug}/${topic_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            backgroundColor: "transparent",
            border: "1px solid #d1d5db",
            color: "#374151",
          }}
        >
          View on Discourse →
        </a>
      </div>
    </div>
  );
}
