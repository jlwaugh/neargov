"use client";

import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";

import { useEffect, useState } from "react";
import { useNearConnector } from "@/hooks/useNearConnector";
import {
  NearRpcClient,
  query,
  clientConfig,
  viewAccount,
  tx,
  block,
} from "@near-js/jsonrpc-client/no-validation";
import { viewFunction } from "@near-js/jsonrpc-client";
import assert from "assert";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface GuestbookMessage {
  sender: string;
  text: string;
  premium: false;
}

const client = new NearRpcClient({
  endpoint: "https://test.rpc.fastnear.com",
});

export default function Home() {
  const {
    connector,
    wallet,
    connectWallet,
    disconnectWallet,
    isLoggedIn,
    accountId,
  } = useNearConnector();

  const [balance, setBalance] = useState(0n);

  const [totalMessages, setTotalMessages] = useState(0);
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);

  useEffect(() => {
    if (!accountId) return;

    async function updateBalance(accountId: string) {
      try {
        const response = await viewAccount(client, {
          accountId: accountId,
        });

        console.log("response", response);

        setBalance(BigInt(response.amount));
      } catch (error) {
        if (error instanceof Error) {
          // @ts-expect-error data may exist
          console.error(error.message, error.data);
        }
      }
    }

    updateBalance(accountId);

    return () => {
      setBalance(0n);
    };
  }, [accountId]);

  useEffect(() => {
    async function updateTotalMessages() {
      try {
        const response = await viewFunction(client, {
          accountId: "guestbook.near-examples.testnet",
          methodName: "total_messages",
        });

        const result = JSON.parse(
          Buffer.from(response.result).toString()
        ) as number;

        setTotalMessages(result);
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message);
        }
      }
    }

    updateTotalMessages();
  }, []);

  useEffect(() => {
    async function updateLastMessages() {
      try {
        const response = await viewFunction(client, {
          accountId: "guestbook.near-examples.testnet",
          methodName: "get_messages",
          argsBase64: Buffer.from(
            JSON.stringify({ limit: "20", from_index: "570" })
          ).toString("base64"),
        });

        const result = JSON.parse(
          Buffer.from(response.result).toString()
        ) as GuestbookMessage[];

        setMessages(result.reverse());
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message);
        }
      }
    }

    updateLastMessages();
  }, []);

  async function addMessageToGuestbook() {
    assert(!!wallet);

    const outcome = await wallet.signAndSendTransaction({
      receiverId: "guestbook.near-examples.testnet",
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "add_message",
            args: {
              text: "Hello, world!",
            },
            gas: "30000000000000", // 30 TGas
            deposit: "0",
          },
        },
      ],
    });

    console.log("outcome", outcome);
  }

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20`}
    >
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <div className="flex gap-4 items-center flex-col">
          {!isLoggedIn && (
            <button
              className="border-1 border-white rounded-lg p-2 cursor-pointer hover:font-bold hover:border-[#e3e3e3]"
              onClick={connectWallet}
            >
              Connect Wallet
            </button>
          )}
          {isLoggedIn && (
            <div className="flex gap-2">
              <h3>Account ID:</h3>
              <span className="font-semibold">{accountId}</span>
            </div>
          )}
          {isLoggedIn && (
            <div className="flex gap-2">
              <h3>Balance:</h3>
              <span className="font-semibold">
                {Number(balance / BigInt(10 ** 20)) / 10 ** 4} NEAR
              </span>
            </div>
          )}
          {isLoggedIn && (
            <div className="flex gap-4">
              <button
                className="border-1 border-white rounded-lg p-2 cursor-pointer hover:font-bold hover:border-[#e3e3e3]"
                onClick={addMessageToGuestbook}
              >
                Add Message
              </button>
              <button
                className="border-1 border-white rounded-lg p-2 cursor-pointer hover:font-bold hover:border-[#e3e3e3]"
                onClick={disconnectWallet}
              >
                Disconnect Wallet
              </button>
            </div>
          )}
          <div className="h-px bg-white w-full"></div>
          <div className="flex gap-2">
            <h3>Total Messages:</h3>
            <span className="font-semibold">{totalMessages}</span>
          </div>

          <div className="flex gap-2 flex-col gap-0.5">
            <h3>Messages:</h3>
            <div className="flex flex-col">
              {messages.map((message, index) => (
                <div key={`message-${index}`}>
                  -{" "}
                  <span className="font-medium">
                    {message.text} (by{" "}
                    <span className="font-semibold underline">
                      {message.sender}
                    </span>
                    )
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
