CREATE TABLE `package_issue_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`commit_hash` text NOT NULL,
	`package_name` text NOT NULL,
	`kind` text NOT NULL,
	`count` integer NOT NULL,
	FOREIGN KEY (`commit_hash`) REFERENCES `analyzed_commits`(`hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `package_issue_stats_commit_hash_idx` ON `package_issue_stats` (`commit_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `package_issue_stats_commit_pkg_kind_uidx` ON `package_issue_stats` (`commit_hash`,`package_name`,`kind`);