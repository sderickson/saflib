ALTER TABLE `users` ADD `email_verified` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `given_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `family_name` text;