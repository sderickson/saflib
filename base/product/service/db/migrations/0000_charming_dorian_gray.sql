CREATE TABLE `__group_name___table` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`stub_enum` text NOT NULL,
	`blob_name` text NOT NULL,
	`file_original_name` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`md5_hash` text
);
--> statement-breakpoint
CREATE TABLE `user_config` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`marketing_emails_opt_in` integer DEFAULT false NOT NULL,
	`marketing_emails_opt_in_at` integer,
	`terms_of_service_agreed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `__offshoot_name___table` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
