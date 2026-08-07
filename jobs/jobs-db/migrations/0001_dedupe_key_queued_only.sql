DROP INDEX `job_dedupe_key_live_uidx`;--> statement-breakpoint
CREATE UNIQUE INDEX `job_dedupe_key_queued_uidx` ON `job` (`dedupe_key`) WHERE "job"."status" IN ('pending', 'retrying');
