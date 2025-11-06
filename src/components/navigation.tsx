"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import NearLogo from "/public/near-logo.svg";
import { useNear } from "@/hooks/useNear";
import { client } from "@/lib/orpc";

export const Navigation = () => {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDiscourseLinked, setIsDiscourseLinked] = useState(false);
  const [checkingDiscourse, setCheckingDiscourse] = useState(false);
  const { signedAccountId, loading, signIn, signOut } = useNear();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const buttonBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.5rem 1.25rem",
    height: "36px",
    lineHeight: 1,
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textDecoration: "none",
  };

  // Check Discourse linkage status
  useEffect(() => {
    const checkDiscourseLink = async () => {
      if (!signedAccountId) {
        setIsDiscourseLinked(false);
        return;
      }

      // Extra validation
      if (typeof signedAccountId !== "string" || signedAccountId.length === 0) {
        setIsDiscourseLinked(false);
        return;
      }

      setCheckingDiscourse(true);

      try {
        const data = await client.discourse.getLinkage({
          nearAccount: signedAccountId,
        });
        setIsDiscourseLinked(!!data);
      } catch (error: any) {
        setIsDiscourseLinked(false);
      } finally {
        setCheckingDiscourse(false);
      }
    };

    checkDiscourseLink();
  }, [signedAccountId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    signOut();
    setShowDropdown(false);
    router.push("/");
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E5E7EB",
        padding: "0 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1rem 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
          <Image
            priority
            src={NearLogo}
            alt="NEAR"
            width={30}
            height={24}
            style={{ cursor: "pointer" }}
          />
        </Link>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* New Proposal Button */}
          <Link
            href="/proposals/new"
            style={{
              ...buttonBase,
              color: "#000000",
              background: "#00ec97",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#00E494")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#00ec97")}
          >
            Create
          </Link>

          {/* Account/Login Section */}
          {loading ? (
            <div style={{ padding: "0.5rem 1.25rem" }}>Loading...</div>
          ) : signedAccountId ? (
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  ...buttonBase,
                  WebkitAppearance: "none",
                  color: "#ffffff",
                  background: "#000000",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#1a1a1a")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#000000")
                }
              >
                {signedAccountId}

                {/* Discourse Connected Indicator */}
                {!checkingDiscourse && isDiscourseLinked && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      background: "#10b981",
                      borderRadius: "50%",
                      border: "2px solid #ffffff",
                      flex: "0 0 auto",
                    }}
                    title="Discourse Connected"
                  />
                )}

                <span style={{ fontSize: "0.75rem" }}>▼</span>
              </button>

              {showDropdown && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 0.5rem)",
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    minWidth: "220px",
                    overflow: "hidden",
                  }}
                >
                  {/* Discourse Status */}
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      background: "#f9fafb",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {checkingDiscourse ? (
                      "Checking Discourse..."
                    ) : (
                      <>
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            background: isDiscourseLinked
                              ? "#10b981"
                              : "#d1d5db",
                            borderRadius: "50%",
                          }}
                        />
                        {isDiscourseLinked
                          ? "Discourse Connected"
                          : "Discourse Not Linked"}
                      </>
                    )}
                  </div>

                  {/* Profile Link */}
                  <Link
                    href="/profile"
                    onClick={() => setShowDropdown(false)}
                    style={{
                      display: "block",
                      padding: "0.75rem 1rem",
                      fontSize: "0.875rem",
                      color: "#1a1a1a",
                      textDecoration: "none",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f9fafb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#ffffff")
                    }
                  >
                    Profile
                  </Link>

                  <div style={{ borderTop: "1px solid #e5e7eb" }} />

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.75rem 1rem",
                      fontSize: "0.875rem",
                      color: "#dc2626",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#fef2f2")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={signIn}
              style={{
                ...buttonBase,
                WebkitAppearance: "none",
                color: "#ffffff",
                background: "#000000",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#1a1a1a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#000000")
              }
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
