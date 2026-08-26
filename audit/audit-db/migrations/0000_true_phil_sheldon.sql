CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`ts` integer NOT NULL,
	`prev_hash` text NOT NULL,
	`row_hash` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`source` text NOT NULL,
	`actor_user_id` text,
	`on_behalf_of_user_id` text,
	`auth_method` text,
	`request_id` text,
	`client_ip` text,
	`event_type` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`outcome` text NOT NULL,
	`git_commit_root` text NOT NULL,
	`git_commit_saflib` text NOT NULL,
	`env` text NOT NULL,
	`details` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_event_ts_idx` ON `audit_event` (`ts`);--> statement-breakpoint
CREATE INDEX `audit_event_resource_idx` ON `audit_event` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `audit_event_event_type_idx` ON `audit_event` (`event_type`);--> statement-breakpoint
CREATE INDEX `audit_event_actor_idx` ON `audit_event` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_event_request_id_idx` ON `audit_event` (`request_id`);