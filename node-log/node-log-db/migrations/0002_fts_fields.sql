-- Search fields and ids too, not just messages: field values (resource ids,
-- actor ids), operation names, request ids and user ids. Rebuilds the
-- external-content index over the new columns and re-indexes existing rows.
DROP TRIGGER IF EXISTS `log_entries_fts_ai`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `log_entries_fts_ad`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `log_entries_fts_au`;
--> statement-breakpoint
DROP TABLE IF EXISTS `log_entries_fts`;
--> statement-breakpoint
CREATE VIRTUAL TABLE `log_entries_fts` USING fts5(`message`, `fields`, `operation_name`, `request_id`, `user_id`, content='log_entries', content_rowid='id', tokenize='unicode61');
--> statement-breakpoint
CREATE TRIGGER `log_entries_fts_ai` AFTER INSERT ON `log_entries` BEGIN
  INSERT INTO `log_entries_fts`(rowid, `message`, `fields`, `operation_name`, `request_id`, `user_id`)
  VALUES (new.id, new.message, new.fields, new.operation_name, new.request_id, new.user_id);
END;
--> statement-breakpoint
CREATE TRIGGER `log_entries_fts_ad` AFTER DELETE ON `log_entries` BEGIN
  INSERT INTO `log_entries_fts`(`log_entries_fts`, rowid, `message`, `fields`, `operation_name`, `request_id`, `user_id`)
  VALUES ('delete', old.id, old.message, old.fields, old.operation_name, old.request_id, old.user_id);
END;
--> statement-breakpoint
CREATE TRIGGER `log_entries_fts_au` AFTER UPDATE ON `log_entries` BEGIN
  INSERT INTO `log_entries_fts`(`log_entries_fts`, rowid, `message`, `fields`, `operation_name`, `request_id`, `user_id`)
  VALUES ('delete', old.id, old.message, old.fields, old.operation_name, old.request_id, old.user_id);
  INSERT INTO `log_entries_fts`(rowid, `message`, `fields`, `operation_name`, `request_id`, `user_id`)
  VALUES (new.id, new.message, new.fields, new.operation_name, new.request_id, new.user_id);
END;
--> statement-breakpoint
INSERT INTO `log_entries_fts`(`log_entries_fts`) VALUES ('rebuild');
