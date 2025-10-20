import { createPluginRuntime } from "every-plugin";

let runtime: ReturnType<typeof createPluginRuntime> | null = null;
let clientPromise: Promise<any> | null = null;

export async function getDiscourseClient() {
  if (clientPromise) {
    return clientPromise;
  }

  clientPromise = (async () => {
    if (!process.env.DISCOURSE_API_KEY) {
      throw new Error("DISCOURSE_API_KEY environment variable is required");
    }

    if (!runtime) {
      console.log("[Discourse] Initializing plugin runtime...");

      runtime = createPluginRuntime({
        registry: {
          "@neargov/discourse": {
            remoteUrl:
              "https://jlwaugh-14-neargov-discourse-plugin-discourse-plu-cfdfb7fa7-ze.zephyrcloud.app/remoteEntry.js",
            version: "0.0.2",
            description: "Connect NEAR accounts with Discourse usernames",
          },
        },
        secrets: {
          DISCOURSE_API_KEY: process.env.DISCOURSE_API_KEY,
        },
      });

      console.log("[Discourse] Loading plugin...");

      const { client, initialized } = await runtime.usePlugin(
        "@neargov/discourse",
        {
          variables: {
            discourseBaseUrl:
              process.env.DISCOURSE_BASE_URL || "https://discuss.near.vote",
            discourseApiUsername:
              process.env.DISCOURSE_API_USERNAME || "system",
            clientId:
              process.env.DISCOURSE_CLIENT_ID || "discourse-near-plugin",
            recipient: process.env.DISCOURSE_RECIPIENT || "social.near",
          },
          secrets: {
            discourseApiKey: process.env.DISCOURSE_API_KEY,
          },
        }
      );

      if (!initialized) {
        throw new Error("Failed to initialize Discourse plugin");
      }

      console.log("[Discourse] Plugin initialized successfully");

      return client;
    }

    return runtime;
  })();

  return clientPromise;
}
