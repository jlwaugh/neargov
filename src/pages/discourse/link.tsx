import { useState } from "react";
import { useNear } from "@/hooks/useNear";

interface LinkageResult {
  success: boolean;
  nearAccount: string;
  discourseUsername: string;
  message: string;
}

export default function DiscourseLink() {
  const { signedAccountId, wallet } = useNear();
  const [discoursePayload, setDiscoursePayload] = useState("");
  const [discourseNonce, setDiscourseNonce] = useState("");
  const [authUrl, setAuthUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkResult, setLinkResult] = useState<LinkageResult | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Generate Discourse auth URL
  const generateAuthUrl = async () => {
    setLoading(true);
    setError("");

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

      if (!response.ok) {
        throw new Error("Failed to generate auth URL");
      }

      const data = await response.json();
      setAuthUrl(data.authUrl);
      setDiscourseNonce(data.nonce);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to generate auth URL");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete the link with NEAR signature
  const completeLink = async () => {
    if (!wallet || !signedAccountId) {
      setError("Please connect your NEAR wallet first");
      return;
    }

    if (!discoursePayload.trim()) {
      setError("Please paste the Discourse User API key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Import required libraries
      const { sign } = await import("near-sign-verify");
      const { base58 } = await import("@scure/base");

      // Create a wallet wrapper that converts base64 signatures to ed25519:<base58> format
      const walletWrapper = {
        signMessage: async (params: any) => {
          const result = await wallet.signMessage(params);

          console.log("Original wallet response:", result);

          // Convert base64 signature to ed25519:<base58> format
          const base64Signature = result.signature;
          const signatureBytes = Uint8Array.from(atob(base64Signature), (c) =>
            c.charCodeAt(0)
          );
          const base58Signature = base58.encode(signatureBytes);
          const formattedSignature = `ed25519:${base58Signature}`;

          console.log("Converted signature:", formattedSignature);

          return {
            ...result,
            signature: formattedSignature,
          };
        },
      };

      // Use near-sign-verify's sign function with the wrapped wallet
      const authToken = await sign("Link my NEAR account to Discourse", {
        signer: walletWrapper,
        recipient: "social.near",
      }).catch((err: any) => {
        console.error("Sign error details:", err);
        if (
          err.message?.includes("User rejected") ||
          err.message?.includes("rejected")
        ) {
          throw new Error(
            "You rejected the signature request. Please try again."
          );
        }
        throw err;
      });

      console.log("Generated auth token:", authToken);

      // Send to plugin to complete link
      const response = await fetch("http://localhost:3001/api/auth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: discoursePayload.trim(),
          nonce: discourseNonce,
          authToken: authToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete link");
      }

      const data = await response.json();
      setLinkResult(data);
      setStep(3);
    } catch (err: any) {
      console.error("Full error:", err);
      setError(err.message || "Failed to complete link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="card">
          <div className="text-center" style={{ marginBottom: "2rem" }}>
            <h1 className="page-title">Link NEAR to Discourse</h1>
            <p className="page-subtitle">
              Connect your NEAR account with your Discourse forum account
            </p>
          </div>

          {!signedAccountId && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠</span>
              <p className="alert-text">
                Please connect your NEAR wallet using the button in the top
                right
              </p>
            </div>
          )}

          {signedAccountId && (
            <div className="feature-card" style={{ marginBottom: "2rem" }}>
              <div className="feature-icon">✓</div>
              <div>
                <h3 className="feature-title">NEAR Wallet Connected</h3>
                <p className="feature-text">{signedAccountId}</p>
              </div>
            </div>
          )}

          {/* Step 1: Generate Auth URL */}
          {step === 1 && (
            <div className="form">
              <div className="info-card">
                <h3 className="info-card-title">
                  Step 1: Start Discourse Authorization
                </h3>
                <p className="info-card-text">
                  Click below to generate a Discourse authorization URL
                </p>
              </div>

              <button
                onClick={generateAuthUrl}
                disabled={loading || !signedAccountId}
                className="btn btn-primary btn-full"
              >
                {loading ? (
                  <>
                    <span className="spinner">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🔗</span>
                    Generate Discourse Auth URL
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Authorize in Discourse */}
          {step === 2 && authUrl && (
            <div className="form">
              <div className="status-card status-card-success">
                <div className="status-card-header">
                  <span className="status-icon">✓</span>
                  <h2 className="status-title">
                    Step 2: Authorize in Discourse
                  </h2>
                </div>
                <p className="status-text">
                  Click the button below to open Discourse and authorize the
                  connection
                </p>
              </div>

              <a
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-full"
              >
                <span className="btn-icon">🔓</span>
                Open Discourse Authorization
              </a>

              <div className="info-card">
                <h4 className="info-card-title">After authorizing:</h4>
                <p className="info-card-text">
                  1. Discourse will show you a User API key (long base64 string)
                  <br />
                  2. Copy that entire key
                  <br />
                  3. Paste it in the field below
                </p>
              </div>

              <div className="input-group">
                <label className="label">Discourse User API Key:</label>
                <textarea
                  value={discoursePayload}
                  onChange={(e) => setDiscoursePayload(e.target.value)}
                  placeholder="Paste the User API key from Discourse here..."
                  rows={6}
                  className="textarea textarea-code"
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠</span>
                  <p className="alert-text">{error}</p>
                </div>
              )}

              <button
                onClick={completeLink}
                disabled={loading || !discoursePayload.trim()}
                className="btn btn-primary btn-full"
              >
                {loading ? (
                  <>
                    <span className="spinner">⏳</span>
                    Linking accounts...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🔐</span>
                    Complete Link with NEAR Signature
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && linkResult && (
            <div className="screener-results">
              <div className="status-card status-card-success">
                <div className="status-card-header">
                  <span className="status-icon">✓</span>
                  <h2 className="status-title">Successfully Linked!</h2>
                </div>
                <p className="status-text">{linkResult.message}</p>
              </div>

              <div className="grid grid-auto">
                <div className="info-card">
                  <div className="info-card-header">
                    <span className="info-card-icon info-card-icon-success">
                      🔗
                    </span>
                    <h4 className="info-card-title">NEAR Account</h4>
                  </div>
                  <p className="info-card-text">{linkResult.nearAccount}</p>
                </div>

                <div className="info-card">
                  <div className="info-card-header">
                    <span className="info-card-icon info-card-icon-success">
                      💬
                    </span>
                    <h4 className="info-card-title">Discourse Username</h4>
                  </div>
                  <p className="info-card-text">
                    {linkResult.discourseUsername}
                  </p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon">✓</div>
                <div>
                  <h3 className="feature-title">What&apos;s Next?</h3>
                  <p className="feature-text">
                    You can now create Discourse posts using your NEAR account
                    signature!
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep(1);
                  setAuthUrl("");
                  setDiscoursePayload("");
                  setDiscourseNonce("");
                  setLinkResult(null);
                  setError("");
                }}
                className="btn btn-primary btn-full"
              >
                Link Another Account
              </button>
            </div>
          )}

          {error && step !== 2 && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠</span>
              <p className="alert-text">{error}</p>
            </div>
          )}
        </div>

        <footer className="footer">
          <p className="footer-text">
            This connects your NEAR account to your Discourse forum account,
            allowing you to post on Discourse by signing messages with your NEAR
            wallet.
          </p>
        </footer>
      </div>
    </div>
  );
}
