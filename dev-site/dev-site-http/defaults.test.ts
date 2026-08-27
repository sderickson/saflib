import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertCliMayOpenDb,
  BIND_MOUNTED_DEV_SITE_DB_SUFFIX,
  DbInUseError,
  isBindMountedSharedDbPath,
} from "./bin/saf-dev-site/defaults.ts";

describe("isBindMountedSharedDbPath", () => {
  it("matches the bind-mounted dev-site sqlite path", () => {
    expect(
      isBindMountedSharedDbPath(
        `/Users/x/acme-widget/product/${BIND_MOUNTED_DEV_SITE_DB_SUFFIX}`,
      ),
    ).toBe(true);
    expect(
      isBindMountedSharedDbPath(
        `C:\\repo\\product\\${BIND_MOUNTED_DEV_SITE_DB_SUFFIX.replace(/\//g, "\\")}`,
      ),
    ).toBe(true);
  });

  it("rejects other sqlite paths", () => {
    expect(isBindMountedSharedDbPath("/tmp/other.sqlite")).toBe(false);
    expect(
      isBindMountedSharedDbPath(
        `/tmp/product/${BIND_MOUNTED_DEV_SITE_DB_SUFFIX.replace("dev-site.sqlite", "other.sqlite")}`,
      ),
    ).toBe(false);
  });
});

describe("assertCliMayOpenDb", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function touchDb(rel = "dev-site.sqlite"): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-site-db-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, rel);
    fs.writeFileSync(dbPath, "");
    return dbPath;
  }

  it("allows missing and library-default paths", () => {
    expect(() => assertCliMayOpenDb(true)).not.toThrow();
    expect(() => assertCliMayOpenDb("/no/such/db.sqlite")).not.toThrow();
  });

  it("allows an idle on-disk db for write", () => {
    const dbPath = touchDb();
    expect(() =>
      assertCliMayOpenDb(dbPath, "write", {
        listHolderPids: () => [],
        isDevSiteDockerApiRunning: () => false,
      }),
    ).not.toThrow();
  });

  it("refuses write when another process holds the file", () => {
    const dbPath = touchDb();
    expect(() =>
      assertCliMayOpenDb(dbPath, "write", {
        listHolderPids: () => [4242],
        isDevSiteDockerApiRunning: () => false,
      }),
    ).toThrow(DbInUseError);
  });

  it("allows read when another process holds the file", () => {
    const dbPath = touchDb();
    expect(() =>
      assertCliMayOpenDb(dbPath, "read", {
        listHolderPids: () => [4242],
        isDevSiteDockerApiRunning: () => true,
      }),
    ).not.toThrow();
  });

  it("refuses write on the shared dev-site path when Docker api is up", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-site-shared-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, BIND_MOUNTED_DEV_SITE_DB_SUFFIX);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "");

    expect(() =>
      assertCliMayOpenDb(dbPath, "write", {
        listHolderPids: () => [],
        isDevSiteDockerApiRunning: () => true,
      }),
    ).toThrow(/Docker api/);
  });
});
