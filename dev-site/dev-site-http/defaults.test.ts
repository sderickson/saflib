import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertCliMayOpenDb,
  DbInUseError,
  isDaemonSharedDbPath,
} from "./bin/saf-dev-site/defaults.ts";

describe("isDaemonSharedDbPath", () => {
  it("matches the bind-mounted daemon sqlite path", () => {
    expect(
      isDaemonSharedDbPath(
        "/Users/x/pathclerk/daemon/dev-site/service/http/data/dev-site.sqlite",
      ),
    ).toBe(true);
    expect(
      isDaemonSharedDbPath(
        "C:\\repo\\daemon\\dev-site\\service\\http\\data\\dev-site.sqlite",
      ),
    ).toBe(true);
  });

  it("rejects other sqlite paths", () => {
    expect(isDaemonSharedDbPath("/tmp/other.sqlite")).toBe(false);
    expect(
      isDaemonSharedDbPath(
        "/tmp/daemon/dev-site/service/http/data/other.sqlite",
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

  it("refuses write on the shared daemon path when Docker api is up", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-site-daemon-"));
    tmpDirs.push(dir);
    const dbPath = path.join(
      dir,
      "daemon/dev-site/service/http/data/dev-site.sqlite",
    );
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
