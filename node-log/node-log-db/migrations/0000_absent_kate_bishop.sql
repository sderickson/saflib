CREATE TABLE `log_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ts` integer NOT NULL,
	`level` text NOT NULL,
	`level_num` integer NOT NULL,
	`service_name` text,
	`subsystem_name` text,
	`operation_name` text,
	`request_id` text,
	`user_id` text,
	`template_hash` text NOT NULL,
	`message` text NOT NULL,
	`fields` text,
	`redactions` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `log_entries_ts_idx` ON `log_entries` (`ts`);--> statement-breakpoint
CREATE INDEX `log_entries_level_ts_idx` ON `log_entries` (`level_num`,`ts`);--> statement-breakpoint
CREATE INDEX `log_entries_request_idx` ON `log_entries` (`request_id`);--> statement-breakpoint
CREATE INDEX `log_entries_template_ts_idx` ON `log_entries` (`template_hash`,`ts`);--> statement-breakpoint
CREATE TABLE `log_templates` (
	`hash` text PRIMARY KEY NOT NULL,
	`template` text NOT NULL,
	`level` text NOT NULL,
	`service_name` text,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `log_templates_first_seen_idx` ON `log_templates` (`first_seen`);--> statement-breakpoint
CREATE INDEX `log_templates_last_seen_idx` ON `log_templates` (`last_seen`);