CREATE TABLE `email_auth` (
	`user_id` integer NOT NULL,
	`email` text NOT NULL,
	`password_hash` blob NOT NULL,
	`verified_at` integer,
	`verification_token` text,
	`verification_token_expires_at` integer,
	`forgot_password_token` text,
	`forgot_password_token_expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_auth_user_id_unique` ON `email_auth` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_auth_email_unique` ON `email_auth` (`email`);--> statement-breakpoint
ALTER TABLE `users` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `last_login_at` integer;