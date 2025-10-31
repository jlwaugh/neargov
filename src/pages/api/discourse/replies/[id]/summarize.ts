import type { NextApiRequest, NextApiResponse } from "next";
import { replyCache, CacheKeys } from "../../../../../utils/cache-utils";

// TypeScript type definitions for Discourse API
interface ReplyToUser {
  username: string;
  id: number;
  avatar_template?: string;
}

interface ActionSummary {
  id: number;
  count: number;
}

interface DiscoursePost {
  id: number;
  post_number: number;
  username: string;
  cooked: string;
  created_at: string;
  like_count?: number;
  actions_summary?: ActionSummary[];
  reply_count?: number;
  reply_to_post_number?: number | null;
  reply_to_user?: ReplyToUser | null;
  topic_id: number;
}

/**
 * POST /api/discourse/replies/[id]/summarize
 *
 * Generates an AI summary of a SINGLE REPLY.
 * Very brief, focused on core message and position.
 *
 * OPTIMIZATIONS:
 * - Direct post fetch (GET /posts/{id}.json) for better performance
 * - 30 minute cache TTL (individual replies don't change)
 * - Reply threading info (shows which post it's replying to)
 *
 * Security:
 * - Public endpoint (no auth required)
 * - Rate limited to prevent abuse
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id: replyId } = req.query;

  if (!replyId || typeof replyId !== "string") {
    return res.status(400).json({ error: "Invalid reply ID" });
  }

  try {
    // ===================================================================
    // CACHE CHECK
    // ===================================================================
    const cacheKey = CacheKeys.reply(replyId);
    const cached = replyCache.get(cacheKey);

    if (cached) {
      // Return cached result
      return res.status(200).json({
        ...cached,
        cached: true,
        cacheAge: Math.round((Date.now() - cached.generatedAt) / 1000), // Age in seconds
      });
    }

    // ===================================================================
    // FETCH FROM DISCOURSE (OPTIMIZED: DIRECT POST FETCH)
    // ===================================================================
    const DISCOURSE_URL =
      process.env.DISCOURSE_URL || "https://discuss.near.vote";
    const DISCOURSE_API_KEY = process.env.DISCOURSE_API_KEY;
    const DISCOURSE_API_USERNAME = process.env.DISCOURSE_API_USERNAME;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (DISCOURSE_API_KEY && DISCOURSE_API_USERNAME) {
      headers["Api-Key"] = DISCOURSE_API_KEY;
      headers["Api-Username"] = DISCOURSE_API_USERNAME;
    }

    // OPTIMIZED: Direct post fetch (primary method)
    // This is faster and uses less bandwidth than fetching the entire topic
    const postResponse = await fetch(`${DISCOURSE_URL}/posts/${replyId}.json`, {
      headers,
    });

    if (!postResponse.ok) {
      return res.status(404).json({
        error: "Reply not found",
        status: postResponse.status,
      });
    }

    const replyPost: DiscoursePost = await postResponse.json();

    // Strip HTML
    const stripHtml = (html: string): string => {
      return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const replyContent = stripHtml(replyPost.cooked);

    // Truncate if needed (though replies are usually shorter)
    const MAX_LENGTH = 4000;
    const truncatedContent =
      replyContent.length > MAX_LENGTH
        ? replyContent.substring(0, MAX_LENGTH) + "\n\n[... truncated ...]"
        : replyContent;

    // ===================================================================
    // GENERATE AI SUMMARY
    // ===================================================================
    const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI API not configured" });
    }

    // Get like count for engagement context
    const likeCount =
      replyPost.actions_summary?.find((a: ActionSummary) => a.id === 2)
        ?.count || 0;

    // Build prompt with all context including reply threading
    const prompt = `You are summarizing a single reply in a NEAR governance discussion. Be very concise and focus on the core message.

**Author:** @${replyPost.username}
**Post Number:** #${replyPost.post_number}
${likeCount > 0 ? `**Engagement:** ${likeCount} likes` : ""}
${
  replyPost.reply_to_post_number && replyPost.reply_to_user
    ? `**Replying to:** @${replyPost.reply_to_user.username} (Post #${replyPost.reply_to_post_number})`
    : replyPost.reply_to_post_number
    ? `**Replying to:** Post #${replyPost.reply_to_post_number}`
    : ""
}

**Reply Content:**
${truncatedContent}

Provide a brief summary (50-100 words maximum) covering:

**Position:** [Supporting/Opposing/Suggesting modifications/Asking questions/Providing information${
      replyPost.reply_to_post_number ? "/Responding to specific concern" : ""
    }]

**Main Point:** [1-2 sentences summarizing the core message${
      replyPost.reply_to_post_number
        ? " and how it relates to the post being replied to"
        : ""
    }]

**Key Details:** [Any specific concerns, suggestions, questions, or data mentioned - keep brief]

Be extremely concise. If the reply is very short or simple (like "I agree" or "+1"), just say so directly without elaboration.`;

    const summaryResponse = await fetch(
      "https://cloud-api.near.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen3-30B-A3B-Instruct-2507",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3, // Very low for focused, brief output
          max_tokens: 250, // Short summaries only
        }),
      }
    );

    if (!summaryResponse.ok) {
      throw new Error(`AI summary failed: ${summaryResponse.status}`);
    }

    const data = await summaryResponse.json();
    const summary: string = data.choices[0]?.message?.content ?? "";

    if (!summary) {
      throw new Error("Empty summary returned from AI");
    }

    // ===================================================================
    // BUILD RESPONSE
    // ===================================================================
    const response = {
      success: true,
      summary,
      replyId,
      author: replyPost.username,
      postNumber: replyPost.post_number,
      createdAt: replyPost.created_at,
      likeCount: likeCount,
      replyTo: replyPost.reply_to_user
        ? {
            username: replyPost.reply_to_user.username,
            postNumber: replyPost.reply_to_post_number,
          }
        : replyPost.reply_to_post_number
        ? {
            postNumber: replyPost.reply_to_post_number,
          }
        : null,
      truncated: replyContent.length > MAX_LENGTH,
      generatedAt: Date.now(), // For cache age tracking
      cached: false,
    };

    // ===================================================================
    // STORE IN CACHE (30 minute TTL)
    // ===================================================================
    replyCache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (error: any) {
    console.error("Reply summary error:", error);
    return res.status(500).json({
      error: "Failed to generate reply summary",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
