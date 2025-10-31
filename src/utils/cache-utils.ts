/**
 * Simple In-Memory Cache for AI Summaries
 *
 * This provides a lightweight caching layer to reduce AI API costs
 * by storing summaries for a configurable time period.
 *
 * Cache TTL (Time To Live):
 * - Proposals: 1 hour (content rarely changes)
 * - Discussions: 5 minutes (active conversations)
 * - Replies: 30 minutes (individual posts are static)
 * - Revisions: 15 minutes (revisions don't change once made, but new ones can be added)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number; // Track cache hit count for monitoring
}

class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private ttl: number; // Time to live in milliseconds
  private name: string;
  private maxSize: number;

  constructor(
    ttlMinutes: number,
    name: string = "cache",
    maxSize: number = 1000
  ) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
    this.name = name;
    this.maxSize = maxSize;
  }

  /**
   * Get item from cache if it exists and hasn't expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;

    // Check if expired
    if (age > this.ttl) {
      this.cache.delete(key);
      console.log(`[${this.name}] Cache MISS (expired) for key: ${key}`);
      return null;
    }

    // Update hit count
    entry.hits++;
    console.log(
      `[${this.name}] Cache HIT for key: ${key} (age: ${Math.round(
        age / 1000
      )}s, hits: ${entry.hits})`
    );

    return entry.data;
  }

  /**
   * Store item in cache
   */
  set(key: string, data: T): void {
    // Evict oldest entries if at max size
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        console.log(`[${this.name}] Cache EVICTED oldest entry: ${oldestKey}`);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
    console.log(`[${this.name}] Cache SET for key: ${key}`);
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Manually invalidate a cache entry
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[${this.name}] Cache INVALIDATED for key: ${key}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[${this.name}] Cache CLEARED (${size} entries removed)`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();

    const stats = {
      totalEntries: entries.length,
      totalHits: entries.reduce((sum, [, entry]) => sum + entry.hits, 0),
      avgAge:
        entries.length > 0
          ? Math.round(
              entries.reduce(
                (sum, [, entry]) => sum + (now - entry.timestamp),
                0
              ) /
                entries.length /
                1000
            )
          : 0,
      entries: entries.map(([key, entry]) => ({
        key,
        age: Math.round((now - entry.timestamp) / 1000),
        hits: entry.hits,
      })),
    };

    return stats;
  }

  /**
   * Clean up expired entries (optional periodic cleanup)
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[${this.name}] Cleanup removed ${removed} expired entries`);
    }

    return removed;
  }
}

// ===================================================================
// CACHE INSTANCES FOR EACH ENDPOINT
// ===================================================================

/**
 * Proposal Cache: 1 hour TTL
 * Proposals rarely change, so we can cache for longer
 */
export const proposalCache = new SimpleCache<any>(60, "ProposalCache");

/**
 * Discussion Cache: 5 minute TTL
 * Active discussions change frequently, shorter cache
 */
export const discussionCache = new SimpleCache<any>(5, "DiscussionCache");

/**
 * Reply Cache: 30 minute TTL
 * Individual replies don't change, medium cache duration
 */
export const replyCache = new SimpleCache<any>(30, "ReplyCache");

/**
 * Revision Cache: 15 minute TTL
 * Revisions don't change once made, but new ones can be added
 */
export const revisionCache = new SimpleCache<any>(15, "RevisionCache");

// ===================================================================
// CACHE KEY BUILDERS
// ===================================================================

/**
 * Build standardized cache keys to avoid collisions
 */
export const CacheKeys = {
  // Proposal summaries (by topic ID)
  proposal: (id: string) => `proposal:${id}`,

  // Discussion summaries (by topic ID)
  discussion: (id: string) => `discussion:${id}`,

  // Reply summaries (by post ID)
  reply: (id: string) => `reply:${id}`,

  // Proposal revision summaries (by topic ID)
  proposalRevision: (topicId: string) => `proposal-revision:${topicId}`,

  // Post revision summaries (by post ID)
  postRevision: (postId: string) => `post-revision:${postId}`,
};

// ===================================================================
// PERIODIC CLEANUP (OPTIONAL)
// ===================================================================

/**
 * Run cleanup every 10 minutes to remove expired entries
 * This prevents memory from growing indefinitely
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    proposalCache.cleanup();
    discussionCache.cleanup();
    replyCache.cleanup();
    revisionCache.cleanup();
  }, 10 * 60 * 1000); // 10 minutes
}

// ===================================================================
// CACHE STATISTICS ENDPOINT HELPER
// ===================================================================

/**
 * Get all cache statistics (useful for monitoring)
 */
export function getAllCacheStats() {
  return {
    proposals: proposalCache.getStats(),
    discussions: discussionCache.getStats(),
    replies: replyCache.getStats(),
    revisions: revisionCache.getStats(),
    timestamp: new Date().toISOString(),
  };
}
