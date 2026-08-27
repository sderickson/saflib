import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createOnDiskDbKeyAccessor,
  packageSqlitePath,
} from "./on-disk-db-key.ts";
import type { DbKey } from "./types.ts";

describe("packageSqlitePath", () => {
  it("joins package data dir with deployment-scoped filename", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-sqlite-"));
    const packageUrl = pathToFileURL(path.join(tmp, "cron.ts")).href;
    const sqlitePath = packageSqlitePath(packageUrl, "cron-db");
    expect(sqlitePath).toBe(
      path.join(tmp, "data", `cron-db-${process.env.DEPLOYMENT_NAME}.sqlite`),
    );
  });

  it("accepts an explicit dataDir override", () => {
    const sqlitePath = packageSqlitePath(
      pathToFileURL("/pkg/cron.ts").href,
      "db",
      "/mnt/audit-data",
    );
    expect(sqlitePath).toBe(
      path.join("/mnt/audit-data", `db-${process.env.DEPLOYMENT_NAME}.sqlite`),
    );
  });
});

describe("createOnDiskDbKeyAccessor", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-sqlite-key-"));
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("lazily connects once and creates the data directory", () => {
    const packageUrl = pathToFileURL(path.join(tmp, "jobs.ts")).href;
    const keys: string[] = [];
    const accessor = createOnDiskDbKeyAccessor({
      packageUrl,
      filePrefix: "jobs-db",
      connect: (options) => {
        keys.push(String(options?.onDisk));
        return `key-${keys.length}` as DbKey;
      },
    });

    expect(accessor.getDbKey()).toBe("key-1");
    expect(accessor.getDbKey()).toBe("key-1");
    expect(keys).toHaveLength(1);
    expect(fs.existsSync(path.join(tmp, "data"))).toBe(true);
    expect(keys[0]).toBe(accessor.getSqlitePath());
  });
});
