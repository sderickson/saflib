-- Rebuild blob_facts: replace exports_json + test_cases_json with specialty_json.
-- Existing rows are dropped; analyzer_version bump forces re-parse on next scan.
DROP TABLE `blob_facts`;
--> statement-breakpoint
CREATE TABLE `blob_facts` (
	`blob_hash` text PRIMARY KEY NOT NULL,
	`analyzer_version` text NOT NULL,
	`line_count` integer NOT NULL,
	`specialty_json` text NOT NULL,
	`computed_at` integer NOT NULL
);
