import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resetProductDbMigrations } from "./reset-product-db-migrations.ts";

describe("resetProductDbMigrations", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    while (tempDirs.length > 0) {
      fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it("deletes the migrations directory", () => {
    const dbRoot = fs.mkdtempSync(path.join(os.tmpdir(), "saf-db-mig-"));
    tempDirs.push(dbRoot);
    const migrations = path.join(dbRoot, "migrations");
    const meta = path.join(migrations, "meta");
    fs.mkdirSync(meta, { recursive: true });
    fs.writeFileSync(
      path.join(migrations, "0000_stub.sql"),
      "CREATE TABLE `__group_name___table` (id text);",
    );
    fs.writeFileSync(
      path.join(meta, "_journal.json"),
      JSON.stringify({
        version: "7",
        dialect: "sqlite",
        entries: [{ idx: 0, tag: "0000_stub" }],
      }),
    );

    resetProductDbMigrations(dbRoot);

    expect(fs.existsSync(migrations)).toBe(false);
  });
});
