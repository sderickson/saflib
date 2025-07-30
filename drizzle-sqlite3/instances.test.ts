import { describe, it, expect, beforeAll } from "vitest";
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { DbManager } from "./instances.ts";
import type { DbKey, DbOptions } from "./types.ts";
import type { Config } from "drizzle-kit";
import config from "./drizzle.config.ts";
import * as schema from "./test-schema.ts";
import assert from "node:assert";
import path from "node:path";
import { typedEnv } from "./env.ts";

typedEnv.DEPLOYMENT_NAME = "arbitrary-name";
const dbPath = path.join(
  import.meta.dirname,
  "./data/db-arbitrary-name.sqlite",
);

const getTempDbPath = (name: string) =>
  resolve(__dirname, `data/temp-test-${name}.db`);

describe("Instance Manager", () => {
  const manager = new DbManager(schema, config, import.meta.url);

  beforeAll(() => {
    if (existsSync(dbPath)) {
      rmSync(dbPath);
    }
  });

  it("should initialize an in-memory database and return a unique DbKey", () => {
    const key1Result = manager.connect();
    const key2Result = manager.connect();

    expect(key1Result).toBeTypeOf("symbol");
    expect(key2Result).toBeTypeOf("symbol");
    expect(key1Result).not.toEqual(key2Result);

    // Clean up
    if (typeof key1Result === "symbol") manager.disconnect(key1Result);
    if (typeof key2Result === "symbol") manager.disconnect(key2Result);
  });

  it("should initialize a file-based database and return a unique DbKey", () => {
    const dbPath = getTempDbPath("init");
    const config: DbOptions = { onDisk: dbPath };
    const keyResult = manager.connect(config);

    expect(keyResult).toBeTypeOf("symbol");

    // Clean up
    if (typeof keyResult === "symbol") manager.disconnect(keyResult);
    rmSync(dbPath, { force: true }); // Ensure file is deleted
  });

  it("should use a default database name if no name is provided", () => {
    expect(existsSync(dbPath)).toBe(false);
    const keyResult = manager.connect({ onDisk: true });
    expect(existsSync(dbPath)).toBe(true);
    expect(dbPath).toContain("db-arbitrary-name.sqlite");
    manager.disconnect(keyResult);
    rmSync(dbPath, { force: true });
    expect(existsSync(dbPath)).toBe(false);
  });

  it("should throw an Error if initialization fails", () => {
    // Simulate failure by providing an invalid migrations path
    const brokenConfig: Config = {
      ...config,
      out: "./non-existent-migrations",
    };
    const faultyManager = new DbManager(schema, brokenConfig, import.meta.url);
    expect(() => faultyManager.connect({})).toThrow(Error);
  });

  it("should get the correct DrizzleInstance using a DbKey", () => {
    const key1Result = manager.connect();
    const key2Result = manager.connect();

    expect(key1Result).toBeTypeOf("symbol");
    expect(key2Result).toBeTypeOf("symbol");
    const key1 = key1Result as DbKey;
    const key2 = key2Result as DbKey;

    const instance1 = manager.get(key1);
    assert(instance1);
    const instance2 = manager.get(key2);
    assert(instance2);

    expect(instance1).toBeDefined();
    expect(instance2).toBeDefined();
    expect(instance1).not.toBe(instance2);

    // Quick check: Insert data into one, verify it doesn't exist in the other
    instance1
      .insert(schema.testTable)
      .values({
        name: "test1",
      })
      .run();
    instance2
      .insert(schema.testTable)
      .values({
        name: "test2",
      })
      .run();

    const result1 = instance1!
      .select()
      .from(schema.testTable)
      .where(eq(schema.testTable.name, "test1"))
      .get();
    const result2 = instance2!
      .select()
      .from(schema.testTable)
      .where(eq(schema.testTable.name, "test2"))
      .get();
    const crossResult1 = instance1!
      .select()
      .from(schema.testTable)
      .where(eq(schema.testTable.name, "test2"))
      .get();
    const crossResult2 = instance2!
      .select()
      .from(schema.testTable)
      .where(eq(schema.testTable.name, "test1"))
      .get();

    expect(result1?.name).toBe("test1");
    expect(result2?.name).toBe("test2");
    expect(crossResult1).toBeUndefined();
    expect(crossResult2).toBeUndefined();

    // Clean up
    manager.disconnect(key1);
    manager.disconnect(key2);
  });

  it("should return undefined when getting an instance with an invalid or deleted key", () => {
    const invalidKey: DbKey = Symbol("invalid");
    expect(manager.get(invalidKey)).toBeUndefined();

    const keyResult = manager.connect();
    expect(keyResult).toBeTypeOf("symbol");
    const key = keyResult as DbKey;

    const deleted = manager.disconnect(key);
    expect(deleted).toBe(true);
    expect(manager.get(key)).toBeUndefined();
  });

  it("should return false when trying to delete an instance with an invalid key", () => {
    const invalidKey: DbKey = Symbol("invalid");
    const deleted = manager.disconnect(invalidKey);
    expect(deleted).toBe(false);
  });
});
