CREATE TABLE `analyzed_commits` (
	`hash` text PRIMARY KEY NOT NULL,
	`parent_hashes` text NOT NULL,
	`authored_at` integer NOT NULL,
	`message` text NOT NULL,
	`refs` text NOT NULL,
	`analyzer_version` text NOT NULL,
	`computed_at` integer NOT NULL,
	`status` text NOT NULL,
	`export_count` integer NOT NULL,
	`test_case_count` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analyzed_commits_authored_at_idx` ON `analyzed_commits` (`authored_at`);--> statement-breakpoint
CREATE TABLE `package_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`commit_hash` text NOT NULL,
	`package_name` text NOT NULL,
	`directory` text NOT NULL,
	`source_files` integer NOT NULL,
	`source_lines` integer NOT NULL,
	`prod_lines` integer NOT NULL,
	`test_lines` integer NOT NULL,
	`test_files` integer NOT NULL,
	FOREIGN KEY (`commit_hash`) REFERENCES `analyzed_commits`(`hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `package_metrics_commit_hash_idx` ON `package_metrics` (`commit_hash`);--> statement-breakpoint
CREATE TABLE `blob_facts` (
	`blob_hash` text PRIMARY KEY NOT NULL,
	`analyzer_version` text NOT NULL,
	`line_count` integer NOT NULL,
	`exports_json` text NOT NULL,
	`test_cases_json` text NOT NULL,
	`computed_at` integer NOT NULL
);
