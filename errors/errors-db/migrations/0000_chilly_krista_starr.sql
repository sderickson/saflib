CREATE TABLE `issue_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`level` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`service_name` text,
	`operation_name` text,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`count` integer NOT NULL,
	`first_seen_version` text,
	`last_seen_version` text,
	`status` text NOT NULL,
	`status_note` text,
	`status_changed_at` integer,
	`status_changed_by` text,
	`resolved_in_version` text,
	`ignored_until` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issue_groups_fingerprint_unique` ON `issue_groups` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `issue_groups_status_last_seen_idx` ON `issue_groups` (`status`,`last_seen`);--> statement-breakpoint
CREATE INDEX `issue_groups_first_seen_idx` ON `issue_groups` (`first_seen`);--> statement-breakpoint
CREATE TABLE `issue_hourly_counts` (
	`group_id` text NOT NULL,
	`hour` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`group_id`, `hour`),
	FOREIGN KEY (`group_id`) REFERENCES `issue_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `issue_hourly_hour_idx` ON `issue_hourly_counts` (`hour`);--> statement-breakpoint
CREATE TABLE `issue_occurrences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` text NOT NULL,
	`ts` integer NOT NULL,
	`request_id` text,
	`message` text NOT NULL,
	`stack` text,
	`fields` text,
	`version` text,
	FOREIGN KEY (`group_id`) REFERENCES `issue_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `issue_occurrences_group_idx` ON `issue_occurrences` (`group_id`,`id`);