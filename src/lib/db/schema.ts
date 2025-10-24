import {
  pgTable,
  varchar,
  jsonb,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import type { Evaluation } from "@/types/evaluation";

/**
 * Screening results table
 *
 * topicId is the primary key - ensures one screening per Discourse topic
 * Database will reject duplicate topicId inserts automatically
 */
export const screeningResults = pgTable(
  "screening_results",
  {
    topicId: varchar("topic_id", { length: 255 }).primaryKey(),
    evaluation: jsonb("evaluation").$type<Evaluation>().notNull(),
    title: text("title").notNull(),
    nearAccount: varchar("near_account", { length: 255 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
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
      table.evaluation
    ),
  })
);

// Export type for TypeScript
export type ScreeningResult = typeof screeningResults.$inferSelect;
export type NewScreeningResult = typeof screeningResults.$inferInsert;
