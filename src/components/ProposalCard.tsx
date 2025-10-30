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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a link
    if ((e.target as HTMLElement).tagName === "A") {
      return;
    }
    window.location.href = `/proposals/${topic_id}`;
  };

  return (
    <div
      className="card"
      style={{
        padding: "1rem 1.25rem",
        cursor: "pointer",
        transition: "all 0.2s",
        borderLeft: "3px solid transparent",
        textDecoration: "none",
        color: "inherit",
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderLeftColor = "#00ec97";
        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderLeftColor = "transparent";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Header: Title and Days Since Activity */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.5rem",
          gap: "1rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1.125rem",
            fontWeight: "600",
            flex: 1,
          }}
        >
          {title}
        </h3>
        {daysSinceActivity !== null && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              whiteSpace: "nowrap",
              paddingTop: "0.125rem",
            }}
          >
            {daysSinceActivity}d ago
          </div>
        )}
      </div>

      {/* Author and Date */}
      <div
        style={{
          fontSize: "0.8125rem",
          color: "#6b7280",
          marginBottom: "0.75rem",
        }}
      >
        <span>
          <strong>@{username}</strong>
        </span>
        {near_wallet && (
          <span style={{ marginLeft: "0.5rem" }}>• {near_wallet}</span>
        )}
        <span style={{ marginLeft: "0.5rem" }}>
          •{" "}
          {new Date(created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Excerpt */}
      {excerpt && (
        <p
          style={{
            margin: "0 0 0.75rem 0",
            color: "#4b5563",
            lineHeight: "1.5",
            fontSize: "0.875rem",
          }}
        >
          {excerpt}
        </p>
      )}

      {/* Footer: View on Discourse button + Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {/* View on Discourse button */}
        <a
          href={`https://discuss.near.vote/t/${topic_slug}/${topic_id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.8125rem",
            color: "#2563eb",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.textDecoration = "underline")
          }
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          View on Discourse →
        </a>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            fontSize: "0.8125rem",
            color: "#6b7280",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>💬</span>
            <span>{formatNumber(reply_count)}</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>👁</span>
            <span>{formatNumber(views)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
