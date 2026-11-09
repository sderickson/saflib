CREATE TABLE `ops_boots` (
	`id` text PRIMARY KEY NOT NULL,
	`service_name` text NOT NULL,
	`started_at` integer NOT NULL,
	`color` text,
	`build_ref` text,
	`image` text,
	`input_hash` text,
	`commit_root` text,
	`commit_saflib` text,
	`dirty` integer,
	`built_at` integer,
	`node_version` text NOT NULL,
	`new_build` integer NOT NULL
);
