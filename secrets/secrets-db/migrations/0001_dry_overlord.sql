CREATE TABLE `service_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`service_name` text NOT NULL,
	`token_hash` text NOT NULL,
	`service_version` text,
	`requested_at` integer NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`approved_at` integer,
	`approved_by` text,
	`last_used_at` integer,
	`access_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_tokens_token_hash_unique` ON `service_tokens` (`token_hash`);