import { useState } from "react";

interface PublishButtonProps {
  wallet: any;
  title: string;
  content: string;
  linkedAccount: { nearAccount: string; discourseUsername: string };
  onPublished: (result: { postUrl: string }) => void;
  onError: (error: string) => void;
}

export const PublishButton = ({
  wallet,
  title,
  content,
  linkedAccount,
  onPublished,
  onError,
}: PublishButtonProps) => {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [postUrl, setPostUrl] = useState("");

  const publish = async () => {
    setPublishing(true);
    onError("");

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

      const authToken = await sign("Create Discourse post", {
        signer: walletWrapper,
        recipient: "social.near",
      });

      // Add AI screening badge
      const badge = `> **✨ AI-Screened Proposal**
> Submitted by \`${linkedAccount.nearAccount}\`
> Pre-approved by NEAR AI

---

`;

      const response = await fetch("/api/discourse/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authToken: authToken,
          title: title,
          raw: badge + content,
          category: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to publish");
      }

      const data = await response.json();

      if (data.success && data.postUrl) {
        setPublished(true);
        setPostUrl(data.postUrl);
        onPublished({ postUrl: data.postUrl });

        setTimeout(() => {
          window.open(data.postUrl, "_blank");
        }, 2000);
      }
    } catch (err: any) {
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
            Your AI-screened proposal has been published to Discourse
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
