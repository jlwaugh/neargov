CREATE TABLE "screening_results" (
	"topic_id" varchar(255) PRIMARY KEY NOT NULL,
	"evaluation" jsonb NOT NULL,
	"title" text NOT NULL,
	"near_account" varchar(255) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_screening_results_near_account" ON "screening_results" USING btree ("near_account");--> statement-breakpoint
CREATE INDEX "idx_screening_results_timestamp" ON "screening_results" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_screening_results_overall_pass" ON "screening_results" USING btree ("evaluation");