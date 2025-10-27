-- Migration: Add revision support to screening_results table
-- This allows multiple screening results per topic (one per revision)

BEGIN;

-- 1. Create new table with the updated schema
CREATE TABLE screening_results_new (
  topic_id VARCHAR(255) NOT NULL,
  revision_number INTEGER NOT NULL,
  evaluation JSONB NOT NULL,
  title TEXT NOT NULL,
  near_account VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  revision_timestamp TIMESTAMP WITH TIME ZONE,

  -- Composite primary key
  PRIMARY KEY (topic_id, revision_number)
);

-- 2. Migrate existing data (assuming all existing records are revision 1)
INSERT INTO screening_results_new (
  topic_id,
  revision_number,
  evaluation,
  title,
  near_account,
  timestamp,
  revision_timestamp
)
SELECT
  topic_id,
  1 as revision_number, -- Treat all existing records as revision 1
  evaluation,
  title,
  near_account,
  timestamp,
  NULL as revision_timestamp
FROM screening_results;

-- 3. Drop old table
DROP TABLE screening_results;

-- 4. Rename new table
ALTER TABLE screening_results_new RENAME TO screening_results;

-- 5. Create indexes
CREATE INDEX idx_screening_results_topic_id ON screening_results(topic_id);
CREATE INDEX idx_screening_results_near_account ON screening_results(near_account);
CREATE INDEX idx_screening_results_timestamp ON screening_results(timestamp DESC);
CREATE INDEX idx_screening_results_overall_pass ON screening_results(evaluation);
CREATE INDEX idx_screening_results_topic_revision ON screening_results(topic_id, revision_number DESC);

COMMIT;

-- Note: If you want to rollback this migration, you'll need to:
-- 1. Keep only the latest revision per topic (or the first, depending on your preference)
-- 2. Remove the revision_number column
-- 3. Make topic_id the primary key again