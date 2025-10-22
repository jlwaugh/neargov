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

    // Get the topic to find the first post
    const topicResponse = await fetch(`${DISCOURSE_URL}/t/${id}.json`, {
      headers,
    });

    if (!topicResponse.ok) {
      throw new Error(`Discourse API error: ${topicResponse.status}`);
    }

    const topicData = await topicResponse.json();
    const firstPost = topicData.post_stream?.posts?.[0];

    if (!firstPost) {
      throw new Error("Post not found");
    }

    const postId = firstPost.id;
    const version = firstPost.version || 1;

    console.log("Post", postId, "version:", version);

    // If version is 1, no edits have been made
    if (version <= 1) {
      return res.status(200).json({
        post_id: postId,
        revisions: [],
        total_revisions: 0,
        current_version: version,
      });
    }

    // Try to fetch revisions
    const revisions = [];

    // First, fetch any available revision to get the first_revision and last_revision range
    let firstRevNum = 1;
    let lastRevNum = version - 1;

    // Try to get the last revision to find the proper range
    for (let attempt = version - 1; attempt >= 1; attempt--) {
      try {
        const testUrl = `${DISCOURSE_URL}/posts/${postId}/revisions/${attempt}.json`;
        const testResponse = await fetch(testUrl, { headers });

        if (testResponse.ok) {
          const testData = await testResponse.json();
          firstRevNum = testData.first_revision || 1;
          lastRevNum = testData.last_revision || version - 1;
          console.log(`Revision range: ${firstRevNum} to ${lastRevNum}`);
          break;
        }
      } catch (err) {
        // Continue trying
      }
    }

    // Now fetch all revisions in the proper range
    for (let i = firstRevNum; i <= lastRevNum; i++) {
      try {
        const revUrl = `${DISCOURSE_URL}/posts/${postId}/revisions/${i}.json`;
        console.log("Fetching:", revUrl);

        const revResponse = await fetch(revUrl, { headers });

        if (revResponse.ok) {
          const revData = await revResponse.json();
          console.log("Got revision", i);

          revisions.push({
            version: revData.current_version || i,
            created_at: revData.created_at,
            username: revData.username,
            edit_reason: revData.edit_reason || "",
            body_changes: revData.body_changes,
            title_changes: revData.title_changes,
          });
        } else {
          console.log("Revision", i, "failed:", revResponse.status);
        }
      } catch (err) {
        console.error(`Error fetching revision ${i}:`, err);
      }
    }

    res.status(200).json({
      post_id: postId,
      revisions,
      total_revisions: revisions.length,
      current_version: version,
    });
  } catch (error: any) {
    console.error("Error fetching revisions:", error);
    res.status(500).json({ error: error.message });
  }
}
