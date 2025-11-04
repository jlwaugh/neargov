/**
 * Client-side utilities for working with Discourse revisions
 * This file contains NO server-side imports and can be used in browser components
 */

interface DiscourseRevision {
  version: number;
  created_at: string;
  username: string;
  edit_reason?: string;
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
 * Extracts the "before" content from a Discourse side_by_side diff
 */
function extractBeforeContent(sideBySide: string): string {
  if (typeof document !== "undefined") {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = sideBySide;

    const revisionDivs = tempDiv.querySelectorAll(".revision-content");
    if (revisionDivs.length > 0) {
      const beforeDiv = revisionDivs[0];
      let content = beforeDiv.innerHTML;

      content = content.replace(/<ins>.*?<\/ins>/g, "");
      content = content.replace(/<del>(.*?)<\/del>/g, "$1");

      return content.trim();
    }
  }

  const regex = /<div class="revision-content">([\s\S]*?)<\/div>/;
  const match = sideBySide.match(regex);
  if (match && match[1]) {
    let content = match[1];
    content = content.replace(/<ins>.*?<\/ins>/g, "");
    content = content.replace(/<del>(.*?)<\/del>/g, "$1");
    return content.trim();
  }
  return "";
}

/**
 * Reconstructs the content and title of a specific revision by working backwards
 * from the current content using Discourse diffs
 *
 * @param currentContent - The current/latest content (HTML)
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
  const currentVersion = revisions.length + 1;

  console.log(`📚 Reconstructing v${targetVersion} from v${currentVersion}`);
  console.log(`📊 Total revisions available:`, revisions.length);

  if (targetVersion === currentVersion) {
    console.log("✅ Target is current version, returning as-is");
    return { content: currentContent, title: currentTitle };
  }

  let content = currentContent;
  let title = currentTitle;

  const sortedRevisions = [...revisions].sort((a, b) => b.version - a.version);

  console.log(
    "🔄 Revisions to process (newest to oldest):",
    sortedRevisions.map((r) => r.version)
  );

  for (const revision of sortedRevisions) {
    console.log(`🔍 Processing revision v${revision.version}`);

    if (revision.version <= targetVersion) {
      console.log(`⏹️ Reached target version, stopping`);
      break;
    }

    if (revision.body_changes?.side_by_side) {
      const beforeContent = extractBeforeContent(
        revision.body_changes.side_by_side
      );
      if (beforeContent) {
        console.log(
          `✅ v${revision.version} body: Extracted before content (${beforeContent.length} chars)`
        );
        content = beforeContent;
      } else {
        console.log(
          `⚠️ v${revision.version} body: Could not extract before content`
        );
      }
    } else {
      console.log(`⚠️ v${revision.version}: No side_by_side body changes`);
    }

    if (revision.title_changes?.side_by_side) {
      const beforeTitle = extractBeforeContent(
        revision.title_changes.side_by_side
      );
      if (beforeTitle) {
        console.log(`✅ v${revision.version} title: Extracted before title`);
        title = beforeTitle;
      }
    }
  }

  console.log(`Final reconstructed content length: ${content.length} chars`);
  return { content, title };
}
