ALTER TABLE `log_entries` ADD `context_kind` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `context_id` text;--> statement-breakpoint
CREATE INDEX `log_entries_context_idx` ON `log_entries` (`context_id`,`id`);--> statement-breakpoint
CREATE INDEX `log_entries_user_idx` ON `log_entries` (`user_id`,`id`);