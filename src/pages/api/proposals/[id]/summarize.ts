import type { NextApiRequest, NextApiResponse } from "next";
import { proposalCache, CacheKeys } from "../../../../utils/cache-utils";

/**
 * POST /api/discourse/proposals/[id]/summarize
 *
 * Generates an AI summary of a PROPOSAL (the first post in a topic).
 * Executive-style summary focusing on key points and decision factors.
 *
 * CACHING: 1 hour TTL (proposals rarely change)
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

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid proposal ID" });
  }

  try {
    // ===================================================================
    // CACHE CHECK
    // ===================================================================
    const cacheKey = CacheKeys.proposal(id);
    const cached = proposalCache.get(cacheKey);

    if (cached) {
      // Return cached result
      return res.status(200).json({
        ...cached,
        cached: true,
        cacheAge: Math.round((Date.now() - cached.generatedAt) / 1000), // Age in seconds
      });
    }

    // ===================================================================
    // FETCH FROM DISCOURSE
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

    const topicResponse = await fetch(`${DISCOURSE_URL}/t/${id}.json`, {
      headers,
    });

    if (!topicResponse.ok) {
      return res.status(404).json({ error: "Proposal not found" });
    }

    const topicData = await topicResponse.json();

    // Get the first post (the proposal)
    const proposalPost = topicData.post_stream?.posts?.[0];
    if (!proposalPost) {
      return res.status(404).json({ error: "Proposal post not found" });
    }

    // Strip HTML
    const stripHtml = (html: string): string => {
      return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const proposalContent = stripHtml(proposalPost.cooked);

    // Truncate if needed
    const MAX_LENGTH = 8000;
    const truncatedContent =
      proposalContent.length > MAX_LENGTH
        ? proposalContent.substring(0, MAX_LENGTH) +
          "\n\n[... content truncated for length ...]"
        : proposalContent;

    // ===================================================================
    // GENERATE AI SUMMARY
    // ===================================================================
    const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI API not configured" });
    }

    const prompt = `You are summarizing a NEAR governance proposal. Provide a comprehensive executive summary.

**Title:** ${topicData.title}
**Author:** @${proposalPost.username}
**Category:** ${topicData.category_id}

**Proposal Content:**
${truncatedContent}

Provide a structured summary (200-400 words) covering:

**Overview:** [2-3 sentences explaining what this proposal is about]

**Key Points:**
- [Main objectives and goals]
- [Important details, metrics, or timelines]
- [Any notable requirements or dependencies]

**Impact:** [Who/what this affects and potential outcomes]

**Considerations:** [Important factors for decision-makers to consider]

Be thorough but concise. Focus on information relevant to decision-making.`;

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
          temperature: 0.5,
          max_tokens: 800,
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
      proposalId: id,
      title: topicData.title,
      author: proposalPost.username,
      createdAt: proposalPost.created_at,
      truncated: proposalContent.length > MAX_LENGTH,
      viewCount: topicData.views,
      replyCount: topicData.posts_count - 1, // Subtract the proposal itself
      likeCount: proposalPost.like_count || 0,
      generatedAt: Date.now(), // For cache age tracking
      cached: false,
    };

    // ===================================================================
    // STORE IN CACHE
    // ===================================================================
    proposalCache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (error: any) {
    console.error("Proposal summary error:", error);
    return res.status(500).json({
      error: "Failed to generate proposal summary",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
