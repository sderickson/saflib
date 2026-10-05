CREATE TABLE `workflow_config` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_run` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_source` text NOT NULL,
	`workflow_ref` text NOT NULL,
	`input` text NOT NULL,
	`mode` text DEFAULT 'print' NOT NULL,
	`skip_todos` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`current_step_index` integer DEFAULT 0 NOT NULL,
	`cwd` text NOT NULL,
	`agent_config` text,
	`parent_run_id` text,
	`parent_step_index` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflow_run_workflow_ref_idx` ON `workflow_run` (`workflow_ref`);--> statement-breakpoint
CREATE INDEX `workflow_run_status_idx` ON `workflow_run` (`status`);--> statement-breakpoint
CREATE INDEX `workflow_run_parent_idx` ON `workflow_run` (`parent_run_id`,`parent_step_index`);--> statement-breakpoint
CREATE TABLE `workflow_step` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`error` text,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `workflow_step_run_id_idx` ON `workflow_step` (`run_id`);--> statement-breakpoint
CREATE INDEX `workflow_step_run_id_step_index_idx` ON `workflow_step` (`run_id`,`step_index`);--> statement-breakpoint
CREATE TABLE `workflow_log` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`step_index` integer,
	`channel` text NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflow_log_run_id_created_at_idx` ON `workflow_log` (`run_id`,`created_at`);