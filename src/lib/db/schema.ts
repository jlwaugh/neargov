import {
  pgTable,
  varchar,
  jsonb,
  text,
  timestamp,
  index,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Evaluation } from "@/types/evaluation";

/**
 * Screening results table
 *
 * Composite primary key (topicId, revisionNumber) - supports multiple screenings per topic
 * Each revision of a topic gets its own screening result
 */
export const screeningResults = pgTable(
  "screening_results",
  {
    topicId: varchar("topic_id", { length: 255 }).notNull(),
    revisionNumber: integer("revision_number").notNull(),
    evaluation: jsonb("evaluation").$type<Evaluation>().notNull(),
    title: text("title").notNull(),
    nearAccount: varchar("near_account", { length: 255 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // Optional: store when the revision was created in the forum
    revisionTimestamp: timestamp("revision_timestamp", { withTimezone: true }),
  },
  (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.topicId, table.revisionNumber] }),
    // Index on topicId for querying all revisions of a topic
    topicIdIdx: index("idx_screening_results_topic_id").on(table.topicId),
    // Index on near_account for filtering by account
    nearAccountIdx: index("idx_screening_results_near_account").on(
      table.nearAccount
    ),
    // Index on timestamp for sorting (DESC for newest first)
    timestampIdx: index("idx_screening_results_timestamp").on(
      table.timestamp.desc()
    ),
    // Index on JSON field for filtering by pass/fail
    overallPassIdx: index("idx_screening_results_overall_pass").on(
      sql`((evaluation->>'overallPass')::boolean)`
    ),
    // Composite index for efficient topic + revision lookups
    topicRevisionIdx: index("idx_screening_results_topic_revision").on(
      table.topicId,
      table.revisionNumber.desc()
    ),
  })
);

// Export type for TypeScript
export type ScreeningResult = typeof screeningResults.$inferSelect;
export type NewScreeningResult = typeof screeningResults.$inferInsert;
