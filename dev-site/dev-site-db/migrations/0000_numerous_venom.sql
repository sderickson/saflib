CREATE TABLE `analyzed_commits` (
	`hash` text PRIMARY KEY NOT NULL,
	`parent_hashes` text NOT NULL,
	`authored_at` integer NOT NULL,
	`message` text NOT NULL,
	`refs` text NOT NULL,
	`analyzer_version` text NOT NULL,
	`computed_at` integer NOT NULL,
	`status` text NOT NULL
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
CREATE TABLE `export_defs` (
	`hash` text PRIMARY KEY NOT NULL,
	`package_name` text NOT NULL,
	`file_path` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commit_exports` (
	`commit_hash` text NOT NULL,
	`export_hash` text NOT NULL,
	PRIMARY KEY(`commit_hash`, `export_hash`),
	FOREIGN KEY (`commit_hash`) REFERENCES `analyzed_commits`(`hash`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`export_hash`) REFERENCES `export_defs`(`hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commit_exports_commit_hash_idx` ON `commit_exports` (`commit_hash`);--> statement-breakpoint
CREATE INDEX `commit_exports_export_hash_idx` ON `commit_exports` (`export_hash`);--> statement-breakpoint
CREATE TABLE `test_case_defs` (
	`hash` text PRIMARY KEY NOT NULL,
	`package_name` text NOT NULL,
	`file_path` text NOT NULL,
	`full_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commit_test_cases` (
	`commit_hash` text NOT NULL,
	`test_case_hash` text NOT NULL,
	PRIMARY KEY(`commit_hash`, `test_case_hash`),
	FOREIGN KEY (`commit_hash`) REFERENCES `analyzed_commits`(`hash`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_case_hash`) REFERENCES `test_case_defs`(`hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commit_test_cases_commit_hash_idx` ON `commit_test_cases` (`commit_hash`);--> statement-breakpoint
CREATE INDEX `commit_test_cases_test_case_hash_idx` ON `commit_test_cases` (`test_case_hash`);