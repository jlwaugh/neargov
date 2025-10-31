import type { NextApiRequest, NextApiResponse } from "next";
import { discussionCache, CacheKeys } from "../../utils/cache-utils";

// TypeScript type definitions for Discourse API
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
  reply_to_user?: {
    username: string;
    id: number;
  } | null;
}

interface ReplyWithEngagement extends DiscoursePost {
  likeCount: number;
}

/**
 * POST /api/discourse/topics/[id]/summarize
 *
 * Generates an AI summary of a DISCUSSION (all replies to a topic).
 * Analyzes community sentiment and key points from replies.
 *
 * CACHING: 5 minute TTL (discussions are active and change frequently)
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
    return res.status(400).json({ error: "Invalid topic ID" });
  }

  try {
    // ===================================================================
    // CACHE CHECK
    // ===================================================================
    const cacheKey = CacheKeys.discussion(id);
    const cached = discussionCache.get(cacheKey);

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
      return res.status(404).json({ error: "Discussion not found" });
    }

    const topicData = await topicResponse.json();

    // Get all posts except the first one (replies only)
    const posts = topicData.post_stream?.posts || [];
    const replies: DiscoursePost[] = posts.slice(1); // Skip the original proposal

    if (replies.length === 0) {
      return res.status(200).json({
        success: true,
        summary:
          "No replies yet. The community hasn't responded to this proposal.",
        topicId: id,
        title: topicData.title,
        replyCount: 0,
        cached: false,
      });
    }

    // Strip HTML
    const stripHtml = (html: string): string => {
      return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Add engagement data (like counts) to each reply
    const repliesWithEngagement: ReplyWithEngagement[] = replies.map(
      (post: DiscoursePost) => ({
        ...post,
        likeCount:
          post.actions_summary?.find((a: ActionSummary) => a.id === 2)?.count ||
          0,
      })
    );

    // Calculate engagement statistics for context
    const totalLikes = repliesWithEngagement.reduce(
      (sum: number, r: ReplyWithEngagement) => sum + r.likeCount,
      0
    );
    const avgLikes =
      replies.length > 0 ? (totalLikes / replies.length).toFixed(1) : 0;
    const maxLikes = Math.max(
      ...repliesWithEngagement.map((r) => r.likeCount),
      0
    );
    const highlyEngagedReplies = repliesWithEngagement.filter(
      (r) => r.likeCount > 5
    ).length;

    // Build discussion text in CHRONOLOGICAL order with engagement and threading info
    const discussionText = repliesWithEngagement
      .slice(0, 100) // Take first 100 replies (chronological)
      .map((post: ReplyWithEngagement, index: number) => {
        const cleanContent = stripHtml(post.cooked);

        // Show like counts to help AI understand relative engagement
        const engagementNote =
          post.likeCount > 0 ? ` [${post.likeCount} likes]` : "";

        // CRITICAL: Show which post this is replying to for conversation threading
        const replyToNote = post.reply_to_post_number
          ? ` [Replying to Post #${post.reply_to_post_number}${
              post.reply_to_user ? ` by @${post.reply_to_user.username}` : ""
            }]`
          : "";

        return `**Reply ${index + 1}** (Post #${post.post_number}) by @${
          post.username
        }${engagementNote}${replyToNote}:\n${cleanContent}`;
      })
      .join("\n\n---\n\n");

    // Truncate if needed
    const MAX_LENGTH = 12000;
    const truncatedDiscussion =
      discussionText.length > MAX_LENGTH
        ? discussionText.substring(0, MAX_LENGTH) +
          "\n\n[... additional replies truncated ...]"
        : discussionText;

    // ===================================================================
    // GENERATE AI SUMMARY
    // ===================================================================
    const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI API not configured" });
    }

    const prompt = `You are summarizing community discussion on a NEAR governance proposal. Analyze the replies and provide insights.

**Topic:** ${topicData.title}
**Total Replies:** ${replies.length}

**Engagement Statistics:**
- Total Likes: ${totalLikes}
- Average Likes per Reply: ${avgLikes}
- Highest Liked Reply: ${maxLikes} likes
- Highly Engaged Replies (6+ likes): ${highlyEngagedReplies}

IMPORTANT CONTEXT:
1. Replies are in CHRONOLOGICAL ORDER to show how the conversation evolved
2. Each reply shows: [X likes] for engagement level
3. CRITICAL: Each reply may show [Replying to Post #X by @username] - this indicates the reply is responding to a SPECIFIC earlier post, not necessarily the previous one chronologically or the original proposal
4. Pay attention to reply chains - when multiple people reply to the same post, it indicates an important sub-discussion

Use like counts to identify:
- Community-validated points (higher likes = stronger agreement)
- Influential voices (consistently high engagement)
- Controversial points (discussion without many likes)
- Emerging consensus (likes increasing over time)

Use reply threading to understand:
- Which specific points sparked debate
- How sub-discussions evolved
- Which concerns were addressed (and by whom)
- Conversation branches and their resolution

Consider timing, validation (likes), AND reply structure when analyzing the discussion.

**Discussion:**
${truncatedDiscussion}

Provide a comprehensive discussion summary (300-500 words) covering:

**Overall Sentiment:** [General community reaction - supportive/opposed/mixed/neutral]

**Key Themes:**
- [Main points of agreement or support - note which have strong community validation]
- [Common concerns or objections raised]
- [Suggested modifications or alternatives]

**Discussion Evolution:** [How the conversation developed - note important reply chains where multiple people engaged on specific points]

**Most Engaged Points:** [Highlight replies with significantly higher likes than average AND/OR those that sparked multiple direct replies]

**Notable Voices:** [Mention particularly engaged or insightful contributors]

**Community Consensus:** [Areas of agreement or persistent disagreement - use both engagement levels and reply patterns to gauge consensus]

**Important Considerations:** [Critical issues raised that warrant attention - especially those that sparked sub-discussions even if not highly liked]

Focus on substance over noise. Weight your analysis based on timing (when said), validation (likes received), AND conversation structure (what sparked replies).`;

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
          temperature: 0.4,
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

    // ===================================================================
    // BUILD RESPONSE
    // ===================================================================
    const response = {
      success: true,
      summary,
      topicId: id,
      title: topicData.title,
      replyCount: replies.length,
      truncated: discussionText.length > MAX_LENGTH,
      engagement: {
        totalLikes,
        totalReplies: replies.length,
        participantCount: topicData.participant_count,
        avgLikesPerReply:
          replies.length > 0 ? (totalLikes / replies.length).toFixed(1) : 0,
      },
      generatedAt: Date.now(), // For cache age tracking
      cached: false,
    };

    // ===================================================================
    // STORE IN CACHE (5 minute TTL for active discussions)
    // ===================================================================
    discussionCache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (error: any) {
    console.error("Discussion summary error:", error);
    return res.status(500).json({
      error: "Failed to generate discussion summary",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
