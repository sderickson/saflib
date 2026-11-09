CREATE TABLE `ops_graph_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
