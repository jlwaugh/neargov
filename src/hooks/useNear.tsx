import { NearConnector, NearWallet } from "@hot-labs/near-connect";
import { useEffect, useState } from "react";
import { JsonRpcProvider } from "@near-js/providers";

let connector: NearConnector | undefined;
const provider = new JsonRpcProvider({ url: "https://rpc.mainnet.near.org" });

if (typeof window !== "undefined") {
  connector = new NearConnector({ network: "mainnet" });
}

interface ViewFunctionParams {
  contractId: string;
  method: string;
  args?: Record<string, any>;
}

interface CallFunctionParams {
  contractId: string;
  method: string;
  args?: Record<string, any>;
  gas?: string;
  deposit?: string;
}

export function useNear() {
  const [wallet, setWallet] = useState<NearWallet | undefined>(undefined);
  const [signedAccountId, setSignedAccountId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!connector) return;

    async function reload() {
      try {
        const { wallet, accounts } = await connector!.getConnectedWallet();
        setWallet(wallet);
        setSignedAccountId(accounts[0].accountId);
      } catch {
        setWallet(undefined);
        setSignedAccountId("");
      } finally {
        setLoading(false);
      }
    }

    async function onSignOut() {
      setWallet(undefined);
      setSignedAccountId("");
    }

    async function onSignIn(payload: {
      wallet: NearWallet;
      accounts: any[];
      success: boolean;
    }) {
      console.log("Signed in with payload", payload);
      setWallet(payload.wallet);
      const accountId = await payload.wallet.getAccounts();
      setSignedAccountId(accountId[0].accountId);
    }

    connector.on("wallet:signOut", onSignOut);
    connector.on("wallet:signIn", onSignIn);

    reload();
    return () => {
      connector!.off("wallet:signOut", onSignOut);
      connector!.off("wallet:signIn", onSignIn);
    };
  }, []);

  async function signIn() {
    if (!connector) return;
    const wallet = await connector.connect();
    console.log("Connected wallet", wallet);
  }

  async function signOut() {
    if (!connector || !wallet) return;
    await connector.disconnect(wallet);
    console.log("Disconnected wallet");
  }

  async function viewFunction({
    contractId,
    method,
    args = {},
  }: ViewFunctionParams) {
    return provider.callFunction(contractId, method, args);
  }

  async function callFunction({
    contractId,
    method,
    args = {},
    gas = "30000000000000",
    deposit = "0",
  }: CallFunctionParams) {
    if (!wallet) throw new Error("Wallet not connected");

    return wallet.signAndSendTransaction({
      receiverId: contractId,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: method,
            args,
            gas,
            deposit,
          },
        },
      ],
    });
  }

  return {
    signedAccountId,
    wallet,
    signIn,
    signOut,
    loading,
    viewFunction,
    callFunction,
    provider,
  };
}
