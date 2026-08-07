CREATE TABLE `job` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`operation_id` text NOT NULL,
	`request` text NOT NULL,
	`user_id` text NOT NULL,
	`authority` text NOT NULL,
	`original_request_id` text NOT NULL,
	`enqueued_by_operation_id` text NOT NULL,
	`parent_job_id` text,
	`run_at` integer NOT NULL,
	`dedupe_key` text,
	`concurrency_key` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer NOT NULL,
	`heartbeat_at` integer,
	`result` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `job_status_run_at_priority_idx` ON `job` (`status`,`run_at`,`priority`);--> statement-breakpoint
CREATE INDEX `job_original_request_id_idx` ON `job` (`original_request_id`);--> statement-breakpoint
CREATE INDEX `job_concurrency_key_idx` ON `job` (`concurrency_key`);--> statement-breakpoint
CREATE INDEX `job_finished_at_idx` ON `job` (`finished_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_dedupe_key_live_uidx` ON `job` (`dedupe_key`) WHERE "job"."status" IN ('pending', 'running', 'retrying');