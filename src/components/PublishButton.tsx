import { useState } from "react";
import { client } from "@/lib/orpc";
import type { Evaluation } from "@/types/evaluation";

interface PublishButtonProps {
  wallet: any;
  title: string;
  content: string;
  linkedAccount: { nearAccount: string; discourseUsername: string };
  evaluation?: Evaluation;
  onPublished: (result: { postUrl: string; topicId: string }) => void;
  onError: (error: string) => void;
}

export const PublishButton = ({
  wallet,
  title,
  content,
  linkedAccount,
  evaluation,
  onPublished,
  onError,
}: PublishButtonProps) => {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [postUrl, setPostUrl] = useState("");

  const publish = async () => {
    setPublishing(true);
    onError("");

    console.log("🔍 Publishing with evaluation:", evaluation);

    try {
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

      // Sign message for Discourse post creation
      const discourseAuthToken = await sign("Create Discourse post", {
        signer: walletWrapper,
        recipient: "social.near",
      });

      // Add AI screening badge
      const badge = `> **✨ AI-Screened Proposal**
> Submitted by \`${linkedAccount.nearAccount}\`
> Pre-approved by NEAR AI

---

`;

      // Publish to Discourse
      const data = await client.discourse.createPost({
        authToken: discourseAuthToken,
        title: title,
        raw: badge + content,
        category: 5,
      });

      if (data.success && data.postUrl) {
        // Extract topic ID from post URL
        const topicIdMatch = data.postUrl.match(/\/t\/[^\/]+\/(\d+)/);
        const topicId = topicIdMatch ? topicIdMatch[1] : null;

        if (!topicId) {
          throw new Error("Failed to extract topic ID from post URL");
        }

        // Save screening results to database
        if (evaluation) {
          try {
            // Sign a new message specifically for saving the analysis
            const saveAuthToken = await sign(`Publish proposal ${topicId}`, {
              signer: walletWrapper,
              recipient: "social.near",
            });

            const saveResponse = await fetch(`/api/saveAnalysis/${topicId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${saveAuthToken}`,
              },
              body: JSON.stringify({
                title,
                content,
                evaluatorAccount: linkedAccount.nearAccount,
              }),
            });

            if (!saveResponse.ok) {
              const errorData = await saveResponse.json();
              console.error("❌ Failed to save screening results:", errorData);
              // Don't fail the whole publish if screening save fails
            } else {
              const saveData = await saveResponse.json();
            }
          } catch (saveError) {
            console.error("❌ Error saving proposal:", saveError);
          }
        } else {
          console.log("⚠️ No evaluation to save");
        }

        setPublished(true);
        setPostUrl(data.postUrl);
        onPublished({ postUrl: data.postUrl, topicId });

        // Open Discourse post in new tab after a short delay
        setTimeout(() => {
          window.open(data.postUrl, "_blank");
        }, 2000);
      }
    } catch (err: any) {
      console.error("❌ Publish error:", err);
      onError(err.message || "Failed to publish to Discourse");
    } finally {
      setPublishing(false);
    }
  };

  if (published) {
    return (
      <div className="form">
        <div className="status-card status-card-success">
          <div className="status-card-header">
            <span className="status-icon">✓</span>
            <h2 className="status-title">Published!</h2>
          </div>
          <p className="status-text">
            Your AI-screened proposal has been published to Discourse and saved
            to the database
          </p>

          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-full"
            style={{ marginTop: "1rem" }}
          >
            View on Discourse →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="form">
      <h3 className="section-title">Step 2: Publish to Discourse</h3>

      <div
        className="status-card status-card-success"
        style={{ marginBottom: "1rem" }}
      >
        <p className="status-text">
          Publishing as: <strong>{linkedAccount.discourseUsername}</strong>
        </p>
        <p
          className="status-text"
          style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}
        >
          ✨ Your AI-screened proposal will be posted to the{" "}
          <strong>Proposals</strong> category
        </p>
      </div>

      <button
        onClick={publish}
        disabled={publishing}
        className="btn btn-primary btn-full"
      >
        {publishing ? (
          <>
            <span className="spinner">⏳</span>
            Publishing...
          </>
        ) : (
          <>
            <span className="btn-icon">📝</span>
            Publish to Discourse
          </>
        )}
      </button>
    </div>
  );
};
