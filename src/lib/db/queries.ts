import { db } from "./index";
import {
  screeningResults,
  type NewScreeningResult,
  type ScreeningResult,
} from "./schema";
import { eq, desc } from "drizzle-orm";

/**
 * Get screening result by topic ID
 */
export async function getScreeningResult(
  topicId: string
): Promise<ScreeningResult | null> {
  const result = await db
    .select()
    .from(screeningResults)
    .where(eq(screeningResults.topicId, topicId))
    .limit(1);

  return result[0] || null;
}

/**
 * Save screening result (throws error if topicId already exists)
 * This enforces "one screening per topic" rule
 *
 * The database will reject duplicates via primary key constraint.
 * Caller should catch error code 23505 and handle as 409 Conflict.
 */
export async function saveScreeningResult(
  data: NewScreeningResult
): Promise<void> {
  await db.insert(screeningResults).values(data);
}

/**
 * Get all screening results for a NEAR account
 */
export async function getScreeningsByAccount(
  nearAccount: string
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .where(eq(screeningResults.nearAccount, nearAccount))
    .orderBy(desc(screeningResults.timestamp));
}

/**
 * Get recent screening results
 */
export async function getRecentScreenings(
  limit = 10
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .orderBy(desc(screeningResults.timestamp))
    .limit(limit);
}

/**
 * Delete screening result by topic ID
 * Should only be used by admins/moderators
 */
export async function deleteScreeningResult(topicId: string): Promise<void> {
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
