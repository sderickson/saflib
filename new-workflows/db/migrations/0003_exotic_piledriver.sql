CREATE TABLE `workflow_agent_turn` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`step_index` integer,
	`session_run_id` text NOT NULL,
	`cli` text NOT NULL,
	`model` text,
	`session_id` text,
	`resumed_session_id` text,
	`status` text NOT NULL,
	`error` text,
	`result_subtype` text,
	`prompt_chars` integer NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`api_duration_ms` integer,
	`num_turns` integer,
	`input_tokens` integer,
	`output_tokens` integer,
	`cache_read_input_tokens` integer,
	`cache_creation_input_tokens` integer,
	`cost_usd` real
);
--> statement-breakpoint
CREATE INDEX `workflow_agent_turn_run_id_idx` ON `workflow_agent_turn` (`run_id`);--> statement-breakpoint
CREATE INDEX `workflow_agent_turn_session_run_id_idx` ON `workflow_agent_turn` (`session_run_id`);--> statement-breakpoint
ALTER TABLE `workflow_step` ADD `label` text;--> statement-breakpoint
ALTER TABLE `workflow_log` ADD `source_run_id` text;--> statement-breakpoint
ALTER TABLE `workflow_log` ADD `source_step_index` integer;