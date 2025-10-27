/**
 * Client-side utilities for working with Discourse revisions
 * This file contains NO server-side imports and can be used in browser components
 */

interface DiscourseRevision {
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
    side_by_side?: string;
    previous?: string;
    current?: string;
  };
}

/**
 * Reconstructs the content and title of a specific revision by working backwards
 * from the current content using Discourse diffs
 *
 * @param currentContent - The current/latest content (plain text)
 * @param currentTitle - The current/latest title
 * @param revisions - All revisions from Discourse API
 * @param targetVersion - Which version to reconstruct (1 = original)
 * @returns The content and title as they appeared at that version
 */
export function reconstructRevisionContent(
  currentContent: string,
  currentTitle: string,
  revisions: DiscourseRevision[],
  targetVersion: number
): { content: string; title: string } {
  // If target is current version, return as-is
  const currentVersion = revisions.length + 1;
  if (targetVersion === currentVersion) {
    return { content: currentContent, title: currentTitle };
  }

  // Helper to strip HTML tags
  const stripHTML = (html: string) => html.replace(/<[^>]*>/g, "").trim();

  // Helper to extract "before" content from side_by_side format
  const extractBeforeContent = (sideBySide: string): string => {
    // Format: <div class="revision-content">OLD</div><div class="revision-content">NEW</div>
    const match = sideBySide.match(
      /<div class="revision-content">(.*?)<\/div>/
    );
    if (match) {
      return stripHTML(match[1]);
    }
    return "";
  };

  let content = currentContent;
  let title = currentTitle;

  // Sort revisions newest to oldest (work backwards)
  const sortedRevisions = [...revisions].sort((a, b) => b.version - a.version);

  for (const revision of sortedRevisions) {
    // If we've gone past our target, stop
    if (revision.version <= targetVersion) {
      break;
    }

    // Reverse this revision's body changes
    if (revision.body_changes?.side_by_side) {
      const beforeContent = extractBeforeContent(
        revision.body_changes.side_by_side
      );
      if (beforeContent) {
        content = beforeContent;
      }
    }

    // Reverse this revision's title changes
    if (revision.title_changes?.side_by_side) {
      const beforeTitle = extractBeforeContent(
        revision.title_changes.side_by_side
      );
      if (beforeTitle) {
        title = beforeTitle;
      }
    }
  }

  return { content, title };
}
