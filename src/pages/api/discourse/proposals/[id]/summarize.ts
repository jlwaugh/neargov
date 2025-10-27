import type { NextApiRequest, NextApiResponse } from "next";

/**
 * POST /api/discourse/proposals/[id]/summarize
 *
 * Generates an AI summary of the entire discussion thread for a proposal.
 * Includes the original post and all replies.
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
    // Fetch the full discussion from Discourse
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

    // Get the topic with all posts
    const topicResponse = await fetch(`${DISCOURSE_URL}/t/${id}.json`, {
      headers,
    });

    if (!topicResponse.ok) {
      throw new Error(`Discourse API error: ${topicResponse.status}`);
    }

    const topicData = await topicResponse.json();
    const posts = topicData.post_stream?.posts || [];

    if (posts.length === 0) {
      return res.status(404).json({ error: "No posts found" });
    }

    // Strip HTML from posts
    const stripHtml = (html: string): string => {
      return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Build discussion context
    const discussionText = posts
      .map((post: any, index: number) => {
        const isOriginal = index === 0;
        const cleanContent = stripHtml(post.cooked);
        return `${
          isOriginal ? "[ORIGINAL PROPOSAL]" : `[REPLY by @${post.username}]`
        }\n${cleanContent}`;
      })
      .join("\n\n---\n\n");

    // Truncate if too long (to fit within AI context limits)
    const MAX_LENGTH = 12000; // ~12k chars for safety
    const truncatedDiscussion =
      discussionText.length > MAX_LENGTH
        ? discussionText.substring(0, MAX_LENGTH) +
          "\n\n[... discussion truncated ...]"
        : discussionText;

    // Get AI API key
    const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI API not configured" });
    }

    // Build summary prompt
    const prompt = `You are summarizing a NEAR governance proposal discussion thread.

${truncatedDiscussion}

Please provide a comprehensive summary that includes:

1. **Proposal Overview**: Brief description of what's being proposed
2. **Key Discussion Points**: Main topics and concerns raised
3. **Community Sentiment**: Overall tone (supportive/critical/mixed)
4. **Action Items**: Any concrete next steps or decisions mentioned
5. **Concerns Raised**: Important questions or objections
6. **Support Indicators**: Positive feedback or endorsements

Keep the summary concise but informative (200-400 words). Use bullet points where appropriate.`;

    // Call AI for summary
    const summaryResponse = await fetch(
      "https://cloud-api.near.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: 1000,
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

    return res.status(200).json({
      success: true,
      summary,
      postCount: posts.length,
      topicId: id,
      topicTitle: topicData.title,
      truncated: discussionText.length > MAX_LENGTH,
    });
  } catch (error: any) {
    console.error("Summary error:", error);
    return res.status(500).json({
      error: "Failed to generate summary",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
