-- Full-text index over log messages. External content (no second copy of the
-- text); triggers keep it in sync as entries are inserted and pruned.
CREATE VIRTUAL TABLE `log_entries_fts` USING fts5(`message`, content='log_entries', content_rowid='id', tokenize='unicode61');
--> statement-breakpoint
CREATE TRIGGER `log_entries_fts_ai` AFTER INSERT ON `log_entries` BEGIN
  INSERT INTO `log_entries_fts`(rowid, `message`) VALUES (new.id, new.message);
END;
--> statement-breakpoint
CREATE TRIGGER `log_entries_fts_ad` AFTER DELETE ON `log_entries` BEGIN
  INSERT INTO `log_entries_fts`(`log_entries_fts`, rowid, `message`) VALUES ('delete', old.id, old.message);
END;
--> statement-breakpoint
CREATE TRIGGER `log_entries_fts_au` AFTER UPDATE ON `log_entries` BEGIN
  INSERT INTO `log_entries_fts`(`log_entries_fts`, rowid, `message`) VALUES ('delete', old.id, old.message);
  INSERT INTO `log_entries_fts`(rowid, `message`) VALUES (new.id, new.message);
END;
