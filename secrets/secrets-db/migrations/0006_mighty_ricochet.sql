ALTER TABLE `access_request` RENAME COLUMN "secret_id" TO "secret_name";--> statement-breakpoint
DROP INDEX `access_request_secret_id_service_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `access_request_secret_name_service_name_unique` ON `access_request` (`secret_name`,`service_name`);