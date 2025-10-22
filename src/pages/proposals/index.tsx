import { useEffect, useState } from "react";
import ProposalCard from "@/components/ProposalCard";

interface Post {
  id: number;
  title: string;
  excerpt: string;
  created_at: string;
  username: string;
  topic_id: number;
  topic_slug: string;
  reply_count?: number;
  views?: number;
  last_posted_at?: string;
  near_wallet?: string;
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
      const response = await fetch("/api/discourse/latest");

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
                <ProposalCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  excerpt={post.excerpt}
                  created_at={post.created_at}
                  username={post.username}
                  topic_id={post.topic_id}
                  topic_slug={post.topic_slug}
                  reply_count={post.reply_count}
                  views={post.views}
                  last_posted_at={post.last_posted_at}
                  near_wallet={post.near_wallet}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
