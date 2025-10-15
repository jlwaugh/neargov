import { useEffect, useState } from "react";
import Link from "next/link";

interface Post {
  id: number;
  title: string;
  excerpt: string;
  created_at: string;
  username: string;
  topic_id: number;
  topic_slug: string;
}

export default function ProposalsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      // Use our API proxy instead of calling Discourse directly
      const response = await fetch("/api/discourse/posts");

      if (!response.ok) {
        throw new Error("Failed to fetch proposals");
      }

      const data = await response.json();
      setPosts(data.latest_posts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="card">
          <div className="text-center" style={{ marginBottom: "2rem" }}>
            <h1 className="page-title">NEAR Proposals</h1>
            <p className="page-subtitle">
              Community proposals published on Discourse
            </p>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <p>Loading proposals...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠</span>
              <p className="alert-text">{error}</p>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="info-card">
              <p className="info-card-text">No proposals found.</p>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="grid" style={{ gap: "1.5rem" }}>
              {posts.map((post) => (
                <div key={post.id} className="card">
                  <h3 style={{ marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                    {post.title}
                  </h3>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                    }}
                  >
                    by {post.username} •{" "}
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                  {post.excerpt && (
                    <p style={{ marginBottom: "1rem", color: "#4b5563" }}>
                      {post.excerpt}
                    </p>
                  )}

                  <a
                    href={`https://discuss.near.vote/t/${post.topic_slug}/${post.topic_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Read More →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
