import { useState } from "react";
import type { Evaluation } from "@/types/evaluation";

interface ScreeningButtonProps {
  topicId: string;
  title: string;
  content: string;
  nearAccount: string;
  wallet: any;
  onScreeningComplete?: () => void;
}

export function ScreeningButton({
  topicId,
  title,
  content,
  nearAccount,
  wallet,
  onScreeningComplete,
}: ScreeningButtonProps) {
  const [screening, setScreening] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");

  const stripHtml = (html: string): string => {
    if (typeof document !== "undefined") {
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent || div.innerText || "";
    }
    return html.replace(/<[^>]*>/g, "");
  };

  const handleScreen = async () => {
    setScreening(true);
    setError("");
    setResult(null);

    try {
      // Check if wallet is available for authentication
      if (!wallet) {
        throw new Error(
          "Wallet not connected. Please connect your NEAR wallet to screen proposals."
        );
      }

      if (!nearAccount) {
        throw new Error("NEAR account not found. Please connect your wallet.");
      }

      // Generate auth token for saving screening
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

      const authToken = await sign(`Evaluate proposal ${topicId}`, {
        signer: walletWrapper,
        recipient: "social.near",
      });

      // Save screening with authentication
      // The API will screen AND save in one call
      const saveResponse = await fetch(`/api/saveAnalysis/${topicId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title,
          content: stripHtml(content),
          evaluatorAccount: nearAccount,
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        if (saveResponse.status === 409) {
          setError("This proposal has already been evaluated.");
        } else if (saveResponse.status === 429) {
          setError(
            saveData.message || "Rate limit exceeded. Please try again later."
          );
        } else {
          throw new Error(
            saveData.error || `Failed to save screening: ${saveResponse.status}`
          );
        }
        return;
      }

      // Show the evaluation result
      setResult(saveData.evaluation);

      console.log("✓ Screening completed and saved!");

      // Notify parent to refetch screening data
      if (onScreeningComplete) {
        onScreeningComplete();
      }

      // Refresh page to show badge after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to screen proposal");
      console.error("Screening error:", err);
    } finally {
      setScreening(false);
    }
  };

  if (result) {
    return (
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          backgroundColor: result.overallPass ? "#f0fdf4" : "#fef2f2",
          borderLeft: `4px solid ${result.overallPass ? "#10b981" : "#ef4444"}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>
            {result.overallPass ? "✓" : "✗"}
          </span>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600" }}>
            {result.overallPass ? "Screening Passed" : "Screening Failed"}
          </h3>
        </div>
        <p style={{ marginBottom: "1rem" }}>
          <strong>Summary:</strong> {result.summary}
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            marginBottom: "1rem",
          }}
        >
          ✓ Results saved! Page will refresh to show badge.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <h3 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
        AI Screening
      </h3>
      <p
        style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}
      >
        Screen this proposal against NEAR governance criteria using AI.
        {!wallet && (
          <span
            style={{ display: "block", marginTop: "0.5rem", color: "#ef4444" }}
          >
            ⚠ Please connect your NEAR wallet to screen proposals.
          </span>
        )}
      </p>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          <span className="alert-icon">⚠</span>
          <p className="alert-text">{error}</p>
        </div>
      )}
      <button
        onClick={handleScreen}
        disabled={screening || !wallet || !nearAccount}
        className="btn btn-primary"
        style={{
          opacity: screening || !wallet || !nearAccount ? 0.6 : 1,
          cursor:
            screening || !wallet || !nearAccount ? "not-allowed" : "pointer",
        }}
      >
        {screening
          ? "Screening..."
          : wallet && nearAccount
          ? "Screen This Proposal"
          : "Connect Wallet to Screen"}
      </button>
    </div>
  );
}
