import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { screeningResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/getAnalysis/[topicId]
 *
 * Fetches screening results for a specific Discourse topic.
 *
 * Public endpoint - no authentication required.
 * Used to display screening badges on proposal pages.
 *
 * Returns:
 * - 200: Screening results found
 * - 404: No screening exists for this topic
 * - 400: Invalid topic ID
 * - 405: Method not allowed (non-GET requests)
 * - 500: Database error
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Extract topicId from URL parameter
  const { topicId } = req.query;

  // Validate topicId
  if (!topicId || typeof topicId !== "string") {
    return res.status(400).json({ error: "Invalid topic ID" });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
      message: "This endpoint only supports GET requests",
    });
  }

  try {
    // Query database for screening results
    const result = await db
      .select()
      .from(screeningResults)
      .where(eq(screeningResults.topicId, topicId))
      .limit(1);

    // Handle case where no screening exists
    if (!result || result.length === 0) {
      return res.status(404).json({
        error: "No screening results found",
        message: `No screening exists for topic ${topicId}`,
      });
    }

    const screening = result[0];

    // Return screening data
    return res.status(200).json({
      evaluation: screening.evaluation,
      title: screening.title,
      nearAccount: screening.nearAccount,
      timestamp: screening.timestamp.toISOString(),
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch screening results",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
