CREATE TABLE `ops_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`alertname` text NOT NULL,
	`severity` text,
	`status` text NOT NULL,
	`labels` text NOT NULL,
	`annotations` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`first_received_at` integer NOT NULL,
	`last_received_at` integer NOT NULL,
	`acked_at` integer,
	`acked_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ops_alerts_fingerprint_unique` ON `ops_alerts` (`fingerprint`);