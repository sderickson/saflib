ALTER TABLE `log_entries` ADD `event` text;--> statement-breakpoint
CREATE INDEX `log_entries_event_ts_idx` ON `log_entries` (`event`,`ts`);--> statement-breakpoint
CREATE VIEW `product_events` AS SELECT `id`, `ts`, `event`, `user_id`, `request_id`, `context_kind`, `context_id`, `fields` FROM `log_entries` WHERE `event` IS NOT NULL;
