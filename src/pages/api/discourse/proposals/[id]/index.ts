import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid proposal ID" });
  }

  try {
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

    // Fetch the topic details
    const topicResponse = await fetch(`${DISCOURSE_URL}/t/${id}.json`, {
      headers,
    });

    if (!topicResponse.ok) {
      throw new Error(`Discourse API error: ${topicResponse.status}`);
    }

    const topicData = await topicResponse.json();

    // Get the first post (the proposal itself)
    const firstPost = topicData.post_stream?.posts?.[0];

    if (!firstPost) {
      throw new Error("Proposal not found");
    }

    // Get all other posts as replies (skip the first post)
    const replies =
      topicData.post_stream?.posts?.slice(1).map((post: any) => ({
        id: post.id,
        username: post.username,
        created_at: post.created_at,
        cooked: post.cooked,
        post_number: post.post_number,
      })) || [];

    // Find the user data
    const user = topicData.details?.created_by;

    // Transform the data
    const proposalDetail = {
      id: topicData.id,
      title: topicData.title,
      content: firstPost.cooked, // HTML content
      created_at: topicData.created_at,
      username: user?.username || firstPost.username,
      topic_id: topicData.id,
      topic_slug: topicData.slug,
      reply_count: topicData.posts_count - 1,
      views: topicData.views || 0,
      last_posted_at: topicData.last_posted_at,
      like_count: topicData.like_count || 0,
      category_id: topicData.category_id,
      near_wallet: user?.custom_fields?.near_wallet || null,
      replies,
    };

    res.status(200).json(proposalDetail);
  } catch (error: any) {
    console.error("Error fetching proposal details:", error);
    res.status(500).json({ error: error.message });
  }
}
