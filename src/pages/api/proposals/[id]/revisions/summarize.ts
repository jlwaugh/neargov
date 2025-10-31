import type { NextApiRequest, NextApiResponse } from "next";
import { revisionCache, CacheKeys } from "../../../../../utils/cache-utils";

// TypeScript type definitions for Discourse API
interface RevisionBodyChange {
  inline?: string;
  side_by_side?: string;
  side_by_side_markdown?: string;
}

interface RevisionTitleChange {
  inline?: string;
  previous?: string;
  current?: string;
}

interface DiscourseRevision {
  version: number;
  created_at: string;
  username: string;
  edit_reason?: string;
  body_changes?: RevisionBodyChange;
  title_changes?: RevisionTitleChange;
}

/**
 * POST /api/proposals/[id]/revisions/summarize
 *
 * Generates an AI summary of ALL REVISIONS to a proposal (topic's first post).
 * Analyzes what changed, why, and the significance of edits.
 *
 * CACHING: 15 minute TTL
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
    const cacheKey = CacheKeys.proposalRevision(id);
    const cached = revisionCache.get(cacheKey);

    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
        cacheAge: Math.round((Date.now() - cached.generatedAt) / 1000),
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

    // Get topic to find first post
    const topicResponse = await fetch(`${DISCOURSE_URL}/t/${id}.json`, {
      headers,
    });

    if (!topicResponse.ok) {
      return res.status(404).json({
        error: "Topic not found",
        status: topicResponse.status,
      });
    }

    const topicData = await topicResponse.json();
    const firstPost = topicData.post_stream?.posts?.[0];

    if (!firstPost) {
      return res.status(404).json({ error: "Post not found in topic" });
    }

    const postId = firstPost.id;
    const version = firstPost.version || 1;

    // If version is 1, no edits have been made
    if (version <= 1) {
      return res.status(200).json({
        success: true,
        summary: "This post has not been edited. No revisions to analyze.",
        topicId: id,
        postId: postId,
        author: firstPost.username,
        currentVersion: version,
        totalRevisions: 0,
        revisions: [],
        cached: false,
      });
    }

    // Fetch all revisions (they start at version 2)
    const revisions: DiscourseRevision[] = [];
    for (let i = 2; i <= version; i++) {
      try {
        const revUrl = `${DISCOURSE_URL}/posts/${postId}/revisions/${i}.json`;
        const revResponse = await fetch(revUrl, { headers });

        if (revResponse.ok) {
          const revData = await revResponse.json();
          revisions.push({
            version: revData.current_version || i,
            created_at: revData.created_at,
            username: revData.username,
            edit_reason: revData.edit_reason || "",
            body_changes: revData.body_changes,
            title_changes: revData.title_changes,
          });
        }
      } catch (err) {
        console.error(`Error fetching revision ${i}:`, err);
      }
    }

    if (revisions.length === 0) {
      return res.status(404).json({
        error: "Could not fetch revision data",
      });
    }

    // ===================================================================
    // PREPARE REVISION DATA FOR AI
    // ===================================================================
    const stripHtml = (html: string): string => {
      return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Build a comprehensive revision timeline
    const revisionTimeline = revisions
      .map((rev, index) => {
        const parts = [`**Revision ${index + 1}** (Version ${rev.version})`];
        parts.push(
          `- **Edited by:** @${rev.username} on ${new Date(
            rev.created_at
          ).toLocaleString()}`
        );

        if (rev.edit_reason) {
          parts.push(`- **Reason:** ${rev.edit_reason}`);
        }

        // Add title changes if present
        if (rev.title_changes?.previous && rev.title_changes?.current) {
          parts.push(`- **Title Changed:**`);
          parts.push(`  - FROM: "${rev.title_changes.previous}"`);
          parts.push(`  - TO: "${rev.title_changes.current}"`);
        }

        // Add body changes
        if (rev.body_changes?.inline) {
          const cleanDiff = stripHtml(rev.body_changes.inline);
          // Truncate very long diffs
          const truncatedDiff =
            cleanDiff.length > 1000
              ? cleanDiff.substring(0, 1000) + "\n[... diff truncated ...]"
              : cleanDiff;
          parts.push(`- **Content Changes:**\n${truncatedDiff}`);
        }

        return parts.join("\n");
      })
      .join("\n\n---\n\n");

    // Truncate if needed
    const MAX_LENGTH = 10000;
    const truncatedTimeline =
      revisionTimeline.length > MAX_LENGTH
        ? revisionTimeline.substring(0, MAX_LENGTH) +
          "\n\n[... additional revisions truncated ...]"
        : revisionTimeline;

    // ===================================================================
    // GENERATE AI SUMMARY
    // ===================================================================
    const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI API not configured" });
    }

    const prompt = `You are analyzing revision history for a NEAR governance post. Provide insights into what changed and why.

**Topic ID:** ${id}
**Post ID:** ${postId}
**Original Author:** @${firstPost.username}
**Total Revisions:** ${revisions.length}
**Current Version:** ${version}

**Revision Timeline:**
${truncatedTimeline}

Provide a comprehensive revision analysis (200-400 words) covering:

**Summary of Changes:** [High-level overview of what was modified across all revisions]

**Revision Breakdown:**
- [Describe each major revision and its purpose]
- [Note if changes were substantive vs. minor corrections]
- [Highlight any title changes]

**Nature of Edits:**
- **Substantive Changes:** [Content that affects meaning, scope, or decision factors]
- **Clarifications:** [Additions or rewording for better understanding]
- **Corrections:** [Fixes to errors, typos, or formatting]
- **Responses to Feedback:** [Changes that appear to address community concerns]

**Timing & Patterns:** [When edits occurred - immediate fixes vs. later substantial changes]

**Significance:** [Overall assessment - are these minor tweaks or major revisions that warrant re-reading?]

**Recommendation:** [Should stakeholders review these changes? Do they materially affect the proposal?]

Be specific about what changed. If revisions are minimal (typos, formatting), state that clearly. If substantive, highlight what decision-makers need to reconsider.`;

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
      topicId: id,
      postId: postId,
      author: firstPost.username,
      currentVersion: version,
      totalRevisions: revisions.length,
      revisions: revisions.map((rev) => ({
        version: rev.version,
        editedBy: rev.username,
        editedAt: rev.created_at,
        editReason: rev.edit_reason || null,
        hasTitleChange: !!(
          rev.title_changes?.previous && rev.title_changes?.current
        ),
        hasBodyChange: !!rev.body_changes?.inline,
      })),
      truncated: revisionTimeline.length > MAX_LENGTH,
      generatedAt: Date.now(),
      cached: false,
    };

    // ===================================================================
    // STORE IN CACHE (15 minute TTL)
    // ===================================================================
    revisionCache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (error: any) {
    console.error("Revision summary error:", error);
    return res.status(500).json({
      error: "Failed to generate revision summary",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
