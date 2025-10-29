DROP INDEX "idx_screening_results_overall_pass";--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'screening_results'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "screening_results" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "screening_results" ADD CONSTRAINT "screening_results_topic_id_revision_number_pk" PRIMARY KEY("topic_id","revision_number");--> statement-breakpoint
ALTER TABLE "screening_results" ADD COLUMN "revision_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "screening_results" ADD COLUMN "revision_timestamp" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_screening_results_topic_id" ON "screening_results" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "idx_screening_results_topic_revision" ON "screening_results" USING btree ("topic_id","revision_number" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_screening_results_overall_pass" ON "screening_results" USING btree (((evaluation->>'overallPass')::boolean));