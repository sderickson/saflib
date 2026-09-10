PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new___group_name___table` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`stub_enum` text NOT NULL,
	`blob_name` text NOT NULL,
	`file_original_name` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`md5_hash` text
);
--> statement-breakpoint
INSERT INTO `__new___group_name___table`("id", "name", "created_at", "updated_at", "stub_enum", "blob_name", "file_original_name", "mimetype", "size", "md5_hash") SELECT "id", "name", "created_at", "updated_at", "stub_enum", "blob_name", "file_original_name", "mimetype", "size", "md5_hash" FROM `__group_name___table`;--> statement-breakpoint
DROP TABLE `__group_name___table`;--> statement-breakpoint
ALTER TABLE `__new___group_name___table` RENAME TO `__group_name___table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;