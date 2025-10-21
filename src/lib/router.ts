import 'server-only';

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
        "https://elliot-braem-210-neargov-discourse-plugin-discour-d48b11295-ze.zephyrcloud.app/remoteEntry.js",
      version: "0.0.2", // version doesn't actually do anything yet, btw
    },
  },
  secrets: {
    DISCOURSE_API_KEY: process.env.DISCOURSE_API_KEY!,
  },
});

const { router: discourseRouter } = await runtime.usePlugin("@neargov/discourse-plugin", {
  variables: {
    discourseBaseUrl:
      process.env.DISCOURSE_BASE_URL || "https://discuss.near.vote",
    discourseApiUsername: process.env.DISCOURSE_API_USERNAME || "system",
    clientId: process.env.DISCOURSE_CLIENT_ID || "discourse-near-plugin",
    recipient: process.env.DISCOURSE_RECIPIENT || "social.near",
  },
  secrets: { discourseApiKey: "{{DISCOURSE_API_KEY}}", }
});


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
    })
  }
});