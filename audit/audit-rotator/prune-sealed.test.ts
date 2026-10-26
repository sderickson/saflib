import { access, constants, mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pruneSealedArchives } from "./prune-sealed.ts";

describe("pruneSealedArchives", () => {
  it("deletes .sqlite.zst files older than retention based on mtime", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "prune-sealed-"));
    await mkdir(dir, { recursive: true });

    const oldFile = path.join(dir, "audit-old.sqlite.zst");
    const newFile = path.join(dir, "audit-new.sqlite.zst");
    await writeFile(oldFile, "old");
    await writeFile(newFile, "new");

    const ancient = new Date("2020-01-01T00:00:00.000Z");
    const recent = new Date();
    await utimes(oldFile, ancient, ancient);
    await utimes(newFile, recent, recent);

    const result = await pruneSealedArchives(dir, 7);

    expect(result.deleted).toBe(1);
    expect(result.kept).toBe(1);

    await expect(
      access(oldFile, constants.F_OK),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(access(newFile, constants.F_OK)).resolves.toBeUndefined();
  });

  it("returns zeros for invalid retention", async () => {
    const r = await pruneSealedArchives("/nonexistent-path-xyz", NaN);
    expect(r).toEqual({ deleted: 0, kept: 0 });
  });
});
