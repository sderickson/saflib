import { describe, it, expect, beforeEach } from "vitest";
import { AuthDB } from "../instance.ts";
import { EmailAuthNotFoundError } from "./email-auth.ts";

describe("email-auth queries", () => {
  let db: AuthDB;

  // Create a new database instance before each test
  beforeEach(async () => {
    db = new AuthDB({ inMemory: true });
    await db.emailAuth.deleteAll();
    await db.users.deleteAll();
  });
});
