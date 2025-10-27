import "server-only";

import { createPluginRuntime, PluginBinding } from "every-plugin";
import type DiscoursePlugin from "../../discourse-plugin";
import { protectedProcedure, publicProcedure } from "./procedures";

type AppBindings = {
  "@neargov/discourse-plugin": PluginBinding<typeof DiscoursePlugin>;
};

const runtime = createPluginRuntime<AppBindings>({
  registry: {
    "@neargov/discourse-plugin": {
      remoteUrl:
        "https://jlwaugh-17-neargov-discourse-plugin-discourse-plu-75e16c7b8-ze.zephyrcloud.app/remoteEntry.js",
    },
  },
  secrets: {
    DISCOURSE_API_KEY: process.env.DISCOURSE_API_KEY!,
  },
});

const { router: discourseRouter } = await runtime.usePlugin(
  "@neargov/discourse-plugin",
  {
    variables: {
      discourseBaseUrl:
        process.env.DISCOURSE_BASE_URL || "https://discuss.near.vote",
      discourseApiUsername: process.env.DISCOURSE_API_USERNAME || "system",
      clientId: process.env.DISCOURSE_CLIENT_ID || "discourse-near-plugin",
      recipient: process.env.DISCOURSE_RECIPIENT || "social.near",
    },
    secrets: { discourseApiKey: "{{DISCOURSE_API_KEY}}" },
  }
);

export const router = publicProcedure.router({
  healthCheck: publicProcedure.handler(() => "OK"),
  discourse: {
    ...publicProcedure.router({
      getUserApiAuthUrl: discourseRouter.getUserApiAuthUrl,
      completeLink: discourseRouter.completeLink,
      getLinkage: discourseRouter.getLinkage,
      ping: discourseRouter.ping,
    }),
    ...protectedProcedure.router({
      createPost: discourseRouter.createPost,
    }),
  },
});
