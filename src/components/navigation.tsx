import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import NearLogo from "/public/near-logo.svg";
import { useNear } from "@/hooks/useNear";

export const Navigation = () => {
  const [label, setLabel] = useState("Loading...");
  const { signedAccountId, loading, signIn, signOut } = useNear();

  useEffect(() => {
    if (loading) return;

    if (signedAccountId) {
      setLabel(`Logout ${signedAccountId}`);
    } else {
      setLabel("Login");
    }
  }, [signedAccountId, loading]);

  const handleClick = () => {
    if (signedAccountId) {
      signOut();
    } else {
      signIn();
    }
  };

  return (
    <nav
      style={{
        position: "sticky" as const,
        top: 0,
        zIndex: 50,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/">
          <Image
            priority
            src={NearLogo}
            alt="NEAR"
            width={30}
            height={24}
            style={{ cursor: "pointer" }}
          />
        </Link>
        <button
          onClick={handleClick}
          style={{
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#FFFFFF",
            background: "#000000",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a1a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#000000")}
        >
          {label}
        </button>
      </div>
    </nav>
  );
};
