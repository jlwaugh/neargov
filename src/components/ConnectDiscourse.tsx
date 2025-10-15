import { useState } from "react";

interface DiscourseConnectProps {
  signedAccountId: string;
  wallet: any;
  onLinked: (result: {
    nearAccount: string;
    discourseUsername: string;
  }) => void;
  onError: (error: string) => void;
}

export const ConnectDiscourse = ({
  signedAccountId,
  wallet,
  onLinked,
  onError,
}: DiscourseConnectProps) => {
  const [step, setStep] = useState<"idle" | "authorizing" | "completing">(
    "idle"
  );
  const [authUrl, setAuthUrl] = useState("");
  const [nonce, setNonce] = useState("");
  const [payload, setPayload] = useState("");

  const startLinking = async () => {
    setStep("authorizing");
    onError("");

    try {
      const response = await fetch(
        "http://localhost:3001/api/auth/user-api-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: "discourse-near-plugin",
            applicationName: "Nearly",
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate auth URL");

      const data = await response.json();
      setAuthUrl(data.authUrl);
      setNonce(data.nonce);
      window.open(data.authUrl, "_blank");
    } catch (err: any) {
      onError(err.message || "Failed to start linking");
      setStep("idle");
    }
  };

  const completeLink = async () => {
    if (!payload.trim()) {
      onError("Please paste the Discourse User API key");
      return;
    }

    setStep("completing");
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

      const authToken = await sign("Link my NEAR account to Discourse", {
        signer: walletWrapper,
        recipient: "social.near",
      });

      const response = await fetch("http://localhost:3001/api/auth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: payload.trim(),
          nonce: nonce,
          authToken: authToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete link");
      }

      const data = await response.json();
      onLinked(data);
    } catch (err: any) {
      onError(err.message || "Failed to complete link");
      setStep("authorizing");
    }
  };

  if (step === "idle") {
    return (
      <div className="form">
        <h3 className="section-title">Step 1: Link Discourse Account</h3>
        <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
          Connect your NEAR wallet to your Discourse account to publish
        </p>
        <button onClick={startLinking} className="btn btn-primary btn-full">
          <span className="btn-icon">🔗</span>
          Link Discourse Account
        </button>
      </div>
    );
  }

  if (step === "authorizing" || step === "completing") {
    return (
      <div className="form">
        <div className="status-card status-card-success">
          <div className="status-card-header">
            <span className="status-icon">✓</span>
            <h2 className="status-title">Authorize in Discourse</h2>
          </div>
          <p className="status-text">
            1. Discourse opened in a new tab - authorize the connection
            <br />
            2. Copy the User API key shown
            <br />
            3. Paste it below
          </p>
        </div>

        <div className="input-group">
          <label className="label">Discourse User API Key:</label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="Paste the User API key from Discourse here..."
            rows={6}
            className="textarea textarea-code"
          />
        </div>

        <button
          onClick={completeLink}
          disabled={step === "completing" || !payload.trim()}
          className="btn btn-primary btn-full"
        >
          {step === "completing" ? (
            <>
              <span className="spinner">⏳</span>
              Linking...
            </>
          ) : (
            <>
              <span className="btn-icon">🔐</span>
              Complete Link
            </>
          )}
        </button>
      </div>
    );
  }

  return null;
};
