import { emailAuth } from "../../schema.ts";
import { AuthDatabaseError } from "../../errors.ts";
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../schema.ts";

export function createEmailAuthQueries(
  db: BetterSQLite3Database<typeof schema>,
) {}
