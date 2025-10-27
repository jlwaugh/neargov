import { db } from "./index";
import {
  screeningResults,
  type NewScreeningResult,
  type ScreeningResult,
} from "./schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Get screening result by topic ID and revision number
 */
export async function getScreeningResult(
  topicId: string,
  revisionNumber: number
): Promise<ScreeningResult | null> {
  const result = await db
    .select()
    .from(screeningResults)
    .where(
      and(
        eq(screeningResults.topicId, topicId),
        eq(screeningResults.revisionNumber, revisionNumber)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Get the latest screening result for a topic
 */
export async function getLatestScreeningResult(
  topicId: string
): Promise<ScreeningResult | null> {
  const result = await db
    .select()
    .from(screeningResults)
    .where(eq(screeningResults.topicId, topicId))
    .orderBy(desc(screeningResults.revisionNumber))
    .limit(1);

  return result[0] || null;
}

/**
 * Get all screening results for a specific topic (all revisions)
 */
export async function getScreeningsByTopic(
  topicId: string
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .where(eq(screeningResults.topicId, topicId))
    .orderBy(desc(screeningResults.revisionNumber));
}

/**
 * Save screening result
 * The database will reject duplicates via composite primary key constraint.
 * Caller should catch error code 23505 and handle as 409 Conflict.
 */
export async function saveScreeningResult(
  data: NewScreeningResult
): Promise<void> {
  await db.insert(screeningResults).values(data);
}

/**
 * Get all screening results for a NEAR account
 * Returns latest revision of each topic by default
 */
export async function getScreeningsByAccount(
  nearAccount: string,
  latestOnly = true
): Promise<ScreeningResult[]> {
  if (!latestOnly) {
    // Return all revisions for all topics
    return db
      .select()
      .from(screeningResults)
      .where(eq(screeningResults.nearAccount, nearAccount))
      .orderBy(desc(screeningResults.timestamp));
  }

  // Get latest revision for each topic
  // Using a subquery to get max revision per topic
  const allResults = await db
    .select()
    .from(screeningResults)
    .where(eq(screeningResults.nearAccount, nearAccount))
    .orderBy(desc(screeningResults.timestamp));

  // Filter to keep only the latest revision per topic
  const latestByTopic = new Map<string, ScreeningResult>();
  for (const result of allResults) {
    const existing = latestByTopic.get(result.topicId);
    if (!existing || result.revisionNumber > existing.revisionNumber) {
      latestByTopic.set(result.topicId, result);
    }
  }

  return Array.from(latestByTopic.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

/**
 * Get recent screening results (latest revision of each topic)
 */
export async function getRecentScreenings(
  limit = 10
): Promise<ScreeningResult[]> {
  const allResults = await db
    .select()
    .from(screeningResults)
    .orderBy(desc(screeningResults.timestamp))
    .limit(limit * 3); // Fetch more to account for multiple revisions

  // Filter to keep only the latest revision per topic
  const latestByTopic = new Map<string, ScreeningResult>();
  for (const result of allResults) {
    const existing = latestByTopic.get(result.topicId);
    if (!existing || result.revisionNumber > existing.revisionNumber) {
      latestByTopic.set(result.topicId, result);
    }
  }

  return Array.from(latestByTopic.values())
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Delete screening result by topic ID and revision number
 * Should only be used by admins/moderators
 */
export async function deleteScreeningResult(
  topicId: string,
  revisionNumber: number
): Promise<void> {
  await db
    .delete(screeningResults)
    .where(
      and(
        eq(screeningResults.topicId, topicId),
        eq(screeningResults.revisionNumber, revisionNumber)
      )
    );
}

/**
 * Delete all screening results for a topic (all revisions)
 * Should only be used by admins/moderators
 */
export async function deleteAllScreeningsForTopic(
  topicId: string
): Promise<void> {
  await db
    .delete(screeningResults)
    .where(eq(screeningResults.topicId, topicId));
}

/**
 * Count total screening results
 */
export async function countScreenings(): Promise<number> {
  const result = await db
    .select({ count: screeningResults.topicId })
    .from(screeningResults);

  return result.length;
}

/**
 * Count unique topics (not revisions)
 */
export async function countUniqueTopics(): Promise<number> {
  const result = await db
    .selectDistinct({ topicId: screeningResults.topicId })
    .from(screeningResults);

  return result.length;
}
