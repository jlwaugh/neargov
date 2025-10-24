"use client";

import { useEffect, useState } from "react";
import { useNear } from "@/hooks/useNear";
import { SocialContract } from "../config";
import { client } from "@/lib/orpc";
import { WalletStatus } from "@/components/WalletStatus";
import { ConnectDiscourse } from "@/components/ConnectDiscourse";

export default function Profile() {
  const {
    signedAccountId,
    viewFunction,
    wallet,
    loading: walletLoading,
  } = useNear();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [discourseLink, setDiscourseLink] = useState<any>(null);
  const [discourseCheckFailed, setDiscourseCheckFailed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadProfile = async () => {
    if (!signedAccountId) return;

    setLoading(true);
    try {
      // Load social.near profile
      const data = await viewFunction({
        contractId: SocialContract,
        method: "get",
        args: {
          keys: [`${signedAccountId}/profile/**`],
        },
      });
      setProfileData(data);

      // Check if Discourse account is linked
      try {
        const linkData = await client.discourse.getLinkage({
          nearAccount: signedAccountId,
        });
        setDiscourseLink(linkData);
        setDiscourseCheckFailed(false);
      } catch (linkError) {
        // Plugin server not available
        console.log("Discourse plugin server not available");
        setDiscourseCheckFailed(true);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (signedAccountId) {
      loadProfile();
    }
  }, [signedAccountId]);

  if (!mounted || walletLoading) {
    return null;
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="card">
          <div className="text-center" style={{ marginBottom: "2rem" }}>
            <h1 className="page-title">Profile</h1>
            {signedAccountId && (
              <p className="page-subtitle">Your NEAR Profile</p>
            )}
          </div>

          {/* Wallet Status - handles loading and connection states */}
          <WalletStatus
            signedAccountId={signedAccountId}
            loading={walletLoading}
          />

          {/* Only show profile content if wallet is connected */}
          {signedAccountId && (
            <>
              {/* Discourse Linkage */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 className="section-title">Discourse Integration</h3>
                {discourseCheckFailed ? (
                  <div
                    className="info-card"
                    style={{ marginTop: "1rem", background: "#fef3c7" }}
                  >
                    <p className="info-card-text" style={{ color: "#92400e" }}>
                      ⚠️ Discourse plugin server is not running. Start it to
                      check linkage status and publish proposals.
                    </p>
                    <code
                      style={{
                        display: "block",
                        marginTop: "0.5rem",
                        padding: "0.5rem",
                        background: "#fffbeb",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                      }}
                    >
                      cd discourse-plugin && bun run dev
                    </code>
                  </div>
                ) : discourseLink?.discourseUsername ? (
                  <div
                    className="status-card status-card-success"
                    style={{ marginTop: "1rem" }}
                  >
                    <div className="status-card-header">
                      <span className="status-icon">✓</span>
                      <h2 className="status-title">Linked to Discourse</h2>
                    </div>
                    <p className="status-text">
                      <strong>Discourse Username:</strong>{" "}
                      {discourseLink.discourseUsername}
                    </p>
                  </div>
                ) : (
                  <ConnectDiscourse
                    signedAccountId={signedAccountId}
                    wallet={wallet}
                    onLinked={(result) => {
                      setDiscourseLink(result);
                      alert(
                        `Successfully linked to ${result.discourseUsername}!`
                      );
                    }}
                    onError={(error) => {
                      console.error("Discourse linking error:", error);
                      if (error) {
                        alert(`Error: ${error}`);
                      }
                    }}
                  />
                )}
              </div>

              {/* Social.near Profile */}
              <div>
                <h3 className="section-title">Social.near Profile</h3>
                {loading && (
                  <p style={{ marginTop: "1rem" }}>Loading profile data...</p>
                )}
                {profileData && (
                  <div className="info-card" style={{ marginTop: "1rem" }}>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        fontSize: "0.875rem",
                        lineHeight: "1.5",
                      }}
                    >
                      {JSON.stringify(profileData, null, 2)}
                    </pre>
                  </div>
                )}
                {!loading && !profileData && (
                  <div className="info-card" style={{ marginTop: "1rem" }}>
                    <p className="info-card-text">
                      No profile data found on social.near
                    </p>

                    <a
                      href={`https://near.social/mob.near/widget/ProfilePage?accountId=${signedAccountId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ marginTop: "1rem", display: "inline-block" }}
                    >
                      Create Profile on NEAR Social
                    </a>
                  </div>
                )}
              </div>

              {/* Contract Info */}
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    margin: 0,
                  }}
                >
                  Interacting with:{" "}
                  <code
                    style={{
                      background: "#e5e7eb",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                    }}
                  >
                    {SocialContract}
                  </code>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
