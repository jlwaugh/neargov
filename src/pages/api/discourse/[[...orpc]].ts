import type { NextApiRequest, NextApiResponse } from "next";
import { RPCHandler } from "@orpc/server/fetch";
import { createPluginRuntime } from "every-plugin";

let handlerPromise: Promise<RPCHandler<any>> | null = null;

async function getHandler() {
  if (handlerPromise) {
    return handlerPromise;
  }

  handlerPromise = (async () => {
    if (!process.env.DISCOURSE_API_KEY) {
      throw new Error("DISCOURSE_API_KEY required");
    }

    console.log("[Discourse] Initializing runtime...");

    const runtime = createPluginRuntime({
      registry: {
        "@neargov/discourse": {
          remoteUrl:
            "https://jlwaugh-14-neargov-discourse-plugin-discourse-plu-cfdfb7fa7-ze.zephyrcloud.app/remoteEntry.js",
          version: "0.0.2",
        },
      },
      secrets: {
        DISCOURSE_API_KEY: process.env.DISCOURSE_API_KEY,
      },
    });

    const { router, initialized } = await runtime.usePlugin(
      "@neargov/discourse",
      {
        variables: {
          discourseBaseUrl:
            process.env.DISCOURSE_BASE_URL || "https://discuss.near.vote",
          discourseApiUsername: process.env.DISCOURSE_API_USERNAME || "system",
          clientId: process.env.DISCOURSE_CLIENT_ID || "discourse-near-plugin",
          recipient: process.env.DISCOURSE_RECIPIENT || "social.near",
        },
        secrets: {
          discourseApiKey: process.env.DISCOURSE_API_KEY,
        },
      }
    );

    if (!initialized) throw new Error("Failed to initialize");

    console.log("[Discourse] Plugin mounted!");

    return new RPCHandler(router); // Mount the ROUTER
  })();

  return handlerPromise;
}

export const config = {
  api: { bodyParser: false },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const orpcHandler = await getHandler();
    const url = new URL(req.url || "", `http://${req.headers.host}`);

    const request = new Request(url, {
      method: req.method || "POST",
      headers: new Headers(req.headers as any),
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined,
    });

    const { matched, response } = await orpcHandler.handle(request, {
      prefix: "/api/discourse",
      context: {},
    });

    if (matched && response) {
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      const body = await response.text();
      res.send(body);
      return;
    }

    res.status(404).json({ error: "Not found" });
  } catch (error: any) {
    console.error("[Discourse] Error:", error);
    res.status(500).json({ error: error.message });
  }
}
