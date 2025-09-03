"use client";

import { NearConnector, NearWallet } from "@hot-labs/near-connect";
import { Account } from "@hot-labs/near-connect/build/types/wallet";
import assert from "assert";
import { useEffect, useMemo, useState } from "react";

export function useNearConnector() {
  const [connector, setConnector] = useState<NearConnector | null>(null);
  const [wallet, setWallet] = useState<NearWallet | undefined>(undefined);

  const [accountId, setAccountId] = useState("");
  const isLoggedIn = useMemo(() => {
    return accountId !== "";
  }, [accountId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function updateConnector() {
      const { NearConnector } = await import("@hot-labs/near-connect");

      const connector = new NearConnector({ network: "testnet" });
      setConnector(connector);

      try {
        const wallet = await connector.wallet();
        setWallet(wallet);

        wallet.signIn

        const accountId = await wallet.getAddress();
        setAccountId(accountId);
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message);
        }
      }
    }

    updateConnector();
  }, []);

  useEffect(() => {
    if (!connector) return;

    async function onSignOut() {
      console.log(`event => wallet:signOut`);

      setWallet(undefined);
      setAccountId("");
    }

    async function onSignIn(payload: {
      wallet: NearWallet;
      accounts: Account[];
      success: boolean;
    }) {
      console.log(`event => wallet:signIn`, payload);

      setWallet(payload.wallet);

      const accountId = await payload.wallet.getAddress();
      setAccountId(accountId);
    }

    connector.on("wallet:signOut", onSignOut);
    connector.on("wallet:signIn", onSignIn);

    return () => {
      connector.off("wallet:signOut", onSignOut);
      connector.off("wallet:signIn", onSignIn);
    };
  }, [connector]);

  async function connectWallet() {
    if (!connector) {
      throw new Error(`No connector`);
    }

    try {
      const wallet = await connector.connect();

      console.log("Connected wallet", wallet);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }

  async function disconnectWallet() {
    assert(!!connector);

    if (!wallet) {
      throw new Error(`No active wallet`);
    }

    try {
      await connector.disconnect(wallet);

      console.log("Disonnected wallet");
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }

  return {
    connector,
    wallet,
    isLoading: connector === null,
    connectWallet,
    disconnectWallet,
    accountId,
    isLoggedIn,
  };
}
