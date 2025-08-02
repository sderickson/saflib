ALTER TABLE `user_permissions` ADD `permission` text NOT NULL;--> statement-breakpoint
ALTER TABLE `user_permissions` DROP COLUMN `permission_id`;