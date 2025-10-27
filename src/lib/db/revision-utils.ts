/**
 * Discourse Revision Utilities
 *
 * Helper functions to work with Discourse revisions and screening results
 */

import {
  saveScreeningResult,
  getLatestScreeningResult,
  getScreeningsByTopic,
} from "./queries";
import type { NewScreeningResult } from "./schema";

/**
 * Response type from /api/discourse/proposals/[id]/revisions
 */
export interface DiscourseRevisionResponse {
  post_id: number;
  revisions: DiscourseRevision[];
  total_revisions: number;
  current_version: number;
}

export interface DiscourseRevision {
  version: number;
  created_at: string;
  username: string;
  edit_reason: string;
  body_changes?: {
    inline?: string;
    side_by_side?: string;
    side_by_side_markdown?: string;
  };
  title_changes?: {
    inline?: string;
    previous?: string;
    current?: string;
  };
}

/**
 * Get the current version number for a topic from Discourse
 */
export async function getCurrentTopicVersion(topicId: string): Promise<number> {
  const response = await fetch(`/api/discourse/proposals/${topicId}/revisions`);

  if (!response.ok) {
    throw new Error(`Failed to fetch revisions: ${response.status}`);
  }

  const data: DiscourseRevisionResponse = await response.json();
  return data.current_version;
}

/**
 * Check if a screening already exists for the current version of a topic
 * Returns: { exists: boolean, currentVersion: number, hasScreening: boolean }
 */
export async function checkScreeningStatus(topicId: string): Promise<{
  exists: boolean;
  currentVersion: number;
  hasScreening: boolean;
  latestScreenedVersion?: number;
}> {
  // Get current version from Discourse
  const currentVersion = await getCurrentTopicVersion(topicId);

  // Check if we have a screening for this version
  const latestScreening = await getLatestScreeningResult(topicId);

  return {
    exists: latestScreening !== null,
    currentVersion,
    hasScreening:
      latestScreening !== null &&
      latestScreening.revisionNumber === currentVersion,
    latestScreenedVersion: latestScreening?.revisionNumber,
  };
}

/**
 * Save a screening result with automatic version detection
 *
 * @param topicId - The Discourse topic ID
 * @param evaluation - The screening evaluation data
 * @param title - The proposal title
 * @param nearAccount - The NEAR account of the proposer
 * @param forceVersion - Optional: specify a specific version to screen
 * @returns The version number that was screened
 */
export async function saveScreeningWithVersion(
  topicId: string,
  evaluation: any,
  title: string,
  nearAccount: string,
  forceVersion?: number
): Promise<number> {
  // Get current version from Discourse if not forced
  const version = forceVersion ?? (await getCurrentTopicVersion(topicId));

  // Fetch revision timestamp if available
  let revisionTimestamp: Date | undefined;
  try {
    const revResponse = await fetch(
      `/api/discourse/proposals/${topicId}/revisions`
    );
    if (revResponse.ok) {
      const revData: DiscourseRevisionResponse = await revResponse.json();
      const revision = revData.revisions.find((r) => r.version === version);
      if (revision?.created_at) {
        revisionTimestamp = new Date(revision.created_at);
      }
    }
  } catch (err) {
    // If we can't get revision timestamp, continue without it
    console.warn("Could not fetch revision timestamp:", err);
  }

  const screeningData: NewScreeningResult = {
    topicId,
    revisionNumber: version,
    evaluation,
    title,
    nearAccount,
    revisionTimestamp,
  };

  await saveScreeningResult(screeningData);
  return version;
}

/**
 * Get all unscreened versions of a topic
 * Returns array of version numbers that need screening
 */
export async function getUnscreenedVersions(
  topicId: string
): Promise<number[]> {
  // Get current version from Discourse
  const currentVersion = await getCurrentTopicVersion(topicId);

  if (currentVersion <= 1) {
    // No revisions exist
    return [1];
  }

  // Get all existing screenings for this topic
  const existingScreenings = await getScreeningsByTopic(topicId);
  const screenedVersions = new Set(
    existingScreenings.map((s) => s.revisionNumber)
  );

  // Find unscreened versions
  const unscreened: number[] = [];
  for (let version = 1; version <= currentVersion; version++) {
    if (!screenedVersions.has(version)) {
      unscreened.push(version);
    }
  }

  return unscreened;
}

/**
 * Determine if a new screening is needed for a topic
 *
 * @returns Object with recommendation and reasoning
 */
export async function shouldScreenTopic(topicId: string): Promise<{
  shouldScreen: boolean;
  reason: string;
  currentVersion: number;
  latestScreenedVersion?: number;
  unscreenedVersions: number[];
}> {
  const currentVersion = await getCurrentTopicVersion(topicId);
  const latestScreening = await getLatestScreeningResult(topicId);
  const unscreened = await getUnscreenedVersions(topicId);

  if (!latestScreening) {
    return {
      shouldScreen: true,
      reason: "No screening exists for this topic",
      currentVersion,
      unscreenedVersions: unscreened,
    };
  }

  if (latestScreening.revisionNumber < currentVersion) {
    return {
      shouldScreen: true,
      reason: `Topic has been edited. Latest screening is for version ${latestScreening.revisionNumber}, current version is ${currentVersion}`,
      currentVersion,
      latestScreenedVersion: latestScreening.revisionNumber,
      unscreenedVersions: unscreened,
    };
  }

  return {
    shouldScreen: false,
    reason: "Latest version is already screened",
    currentVersion,
    latestScreenedVersion: latestScreening.revisionNumber,
    unscreenedVersions: [],
  };
}

/**
 * Get a summary of screening coverage for a topic
 */
export async function getScreeningCoverage(topicId: string): Promise<{
  totalVersions: number;
  screenedVersions: number;
  unscreenedVersions: number;
  coveragePercent: number;
  versions: {
    version: number;
    screened: boolean;
    screeningTimestamp?: Date;
  }[];
}> {
  const currentVersion = await getCurrentTopicVersion(topicId);
  const screenings = await getScreeningsByTopic(topicId);

  const screeningMap = new Map(
    screenings.map((s) => [s.revisionNumber, s.timestamp])
  );

  const versions = [];
  for (let v = 1; v <= currentVersion; v++) {
    versions.push({
      version: v,
      screened: screeningMap.has(v),
      screeningTimestamp: screeningMap.get(v),
    });
  }

  const screenedCount = screeningMap.size;
  const coveragePercent =
    currentVersion > 0 ? (screenedCount / currentVersion) * 100 : 0;

  return {
    totalVersions: currentVersion,
    screenedVersions: screenedCount,
    unscreenedVersions: currentVersion - screenedCount,
    coveragePercent: Math.round(coveragePercent),
    versions,
  };
}
