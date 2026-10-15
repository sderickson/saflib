CREATE TABLE `workflow_agent_turn_raw` (
	`turn_id` text PRIMARY KEY NOT NULL,
	`output` text NOT NULL,
	`omitted_chars` integer NOT NULL,
	`created_at` integer NOT NULL
);
