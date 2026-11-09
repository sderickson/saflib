CREATE TABLE `ops_notifier_state` (
	`channel` text PRIMARY KEY NOT NULL,
	`cursor` integer NOT NULL,
	`last_sent_at` integer,
	`day` text NOT NULL,
	`sent_today` integer NOT NULL
);
