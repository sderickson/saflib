CREATE TABLE `ops_dependency_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`checked_at` integer NOT NULL,
	`lockfile_hash` text NOT NULL,
	`report` text NOT NULL
);
