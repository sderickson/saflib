import { readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import winston from "winston";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/utils";
import { createPersistentLogTransport, listLogs, logsDb } from "./index.ts";

const packetId = "Gdv0MF6Rlvh5";
const actorId = "876a2cd5-eb3e-4055-b015-d0e118990f36";

describe("log search", () => {
  let dbKey: DbKey;
  let transport: ReturnType<typeof createPersistentLogTransport>;
  let logger: winston.Logger;

  beforeEach(() => {
    dbKey = logsDb.connect();
    transport = createPersistentLogTransport({
      getDbKey: () => dbKey,
      flushIntervalMs: 60_000,
    });
    logger = winston.createLogger({ level: "debug", transports: [transport] });
  });
  afterEach(() => transport.close());

  it("finds lines by field values, operation, request and user ids, not just messages", async () => {
    logger
      .child({
        service_name: "svc",
        subsystem_name: "svc.http",
        operation_name: "updateQuestionnaireAnswersPackets",
        request_id: "9d568123-acc6-48ac-b78d-488e1b117287",
        user_id: "u_42",
      })
      .info("audit event recorded", {
        resource_id: packetId,
        actor_user_id: actorId,
      });
    logger
      .child({ operation_name: "listMatters", request_id: "other" })
      .info("unrelated line");
    transport.flush();

    const messagesOf = async (q: string) =>
      (await throwError(listLogs(dbKey, { q }))).entries.map((e) => e.message);
    expect(await messagesOf(packetId)).toEqual(["audit event recorded"]);
    expect(await messagesOf(actorId)).toEqual(["audit event recorded"]);
    expect(await messagesOf("updateQuestionnaireAnswersPackets")).toEqual([
      "audit event recorded",
    ]);
    expect(await messagesOf("9d568123-acc6-48ac-b78d-488e1b117287")).toEqual([
      "audit event recorded",
    ]);
    expect(await messagesOf("u_42")).toEqual(["audit event recorded"]);
    expect(await messagesOf("unrelated")).toEqual(["unrelated line"]);
  });
});

describe("migration 0002 (search fields and ids)", () => {
  const migrationsDir = path.join(import.meta.dirname, "migrations");
  const run = (db: Database.Database, file: string) => {
    for (const statement of readFileSync(
      path.join(migrationsDir, file),
      "utf8",
    ).split("--> statement-breakpoint")) {
      if (statement.trim()) db.exec(statement);
    }
  };

  it("re-indexes rows written before it", () => {
    const db = new Database(":memory:");
    run(db, "0000_absent_kate_bishop.sql");
    run(db, "0001_fts.sql");
    db.prepare(
      `INSERT INTO log_entries (ts, level, level_num, operation_name, request_id, user_id, template_hash, message, fields)
       VALUES (1, 'info', 2, 'updateQuestionnaireAnswersPackets', 'req-1', 'u_1', 'h', 'audit event recorded', ?)`,
    ).run(JSON.stringify({ resource_id: packetId }));
    const matches = (q: string) =>
      (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM log_entries_fts WHERE log_entries_fts MATCH ?",
          )
          .get(`"${q}"`) as { n: number }
      ).n;
    expect(matches(packetId)).toBe(0); // 0001 only indexed messages

    run(db, "0002_fts_fields.sql");
    expect(matches(packetId)).toBe(1);
    expect(matches("updateQuestionnaireAnswersPackets")).toBe(1);
    expect(matches("audit")).toBe(1);

    // New and deleted rows stay in sync through the replaced triggers.
    db.prepare(
      `INSERT INTO log_entries (ts, level, level_num, template_hash, message, fields) VALUES (2, 'info', 2, 'h', 'later', ?)`,
    ).run(JSON.stringify({ resource_id: "Pk_later" }));
    expect(matches("Pk_later")).toBe(1);
    db.prepare("DELETE FROM log_entries WHERE message = 'later'").run();
    expect(matches("Pk_later")).toBe(0);
    db.close();
  });
});
