import session from "express-session";
import sqlite from "better-sqlite3";
import BetterSqlite3SessionStore from "better-sqlite3-session-store";
import path from "path";
import { fileURLToPath } from "url";

const SqliteStore = BetterSqlite3SessionStore(session);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createSessionStore(nodeEnv: string) {
  const sessionDbName = `sessions-${nodeEnv}.sqlite`;
  const sessionDb = new sqlite(path.join(__dirname, "../data", sessionDbName));

  return new SqliteStore({
    client: sessionDb,
    expired: {
      clear: true,
      intervalMs: 900000, //ms = 15min
    },
  });
}
