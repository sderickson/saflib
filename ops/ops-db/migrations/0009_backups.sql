CREATE TABLE `ops_backups` (
	`id` text PRIMARY KEY NOT NULL,
	`database` text NOT NULL,
	`tag` text NOT NULL,
	`claim_key` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`size_bytes` integer,
	`raw_bytes` integer,
	`sha256` text,
	`object_key` text,
	`migration` text,
	`stats` text,
	`problems` text,
	`error` text,
	`verified_at` integer,
	`verified_ok` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ops_backups_claim_key_unique` ON `ops_backups` (`claim_key`);--> statement-breakpoint
CREATE INDEX `ops_backups_database_started_idx` ON `ops_backups` (`database`,`started_at`);