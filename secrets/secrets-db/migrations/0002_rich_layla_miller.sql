CREATE TABLE `access_request` (
	`id` text PRIMARY KEY NOT NULL,
	`secret_id` text NOT NULL,
	`service_name` text NOT NULL,
	`requested_at` integer NOT NULL,
	`status` text NOT NULL,
	`granted_at` integer,
	`granted_by` text,
	`access_count` integer DEFAULT 0 NOT NULL,
	`last_accessed_at` integer
);
