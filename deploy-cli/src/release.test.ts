import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hashDirectory, makeReleaseStamp, writeReleaseStamp } from "./release.ts";

function assets(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "release-"));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

describe("release stamp", () => {
  it("hashes paths and contents, so a config edit changes the hash", () => {
    const a = hashDirectory(assets({ "kratos/kratos.yml": "a", "env": "x" }));
    expect(hashDirectory(assets({ "env": "x", "kratos/kratos.yml": "a" }))).toBe(a);
    expect(hashDirectory(assets({ "kratos/kratos.yml": "b", "env": "x" }))).not.toBe(a);
    expect(hashDirectory(assets({ "kratos/other.yml": "a", "env": "x" }))).not.toBe(a);
  });

  it("ignores a previous stamp in the tree", () => {
    const dir = assets({ "env": "x" });
    const before = hashDirectory(dir);
    writeReleaseStamp(dir, makeReleaseStamp(dir, { commits: { root: "r", saflib: "s" } }));
    expect(hashDirectory(dir)).toBe(before);
  });

  it("writes release/release.json", () => {
    const dir = assets({ "env": "x" });
    const out = mkdtempSync(path.join(tmpdir(), "release-out-"));
    const stamp = makeReleaseStamp(dir, {
      now: new Date("2026-11-09T00:00:00Z"),
      commits: { root: "abc", saflib: "def-dirty" },
    });
    const file = writeReleaseStamp(out, stamp);
    expect(file).toBe(path.join(out, "release", "release.json"));
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({
      released_at: "2026-11-09T00:00:00.000Z",
      commits: { root: "abc", saflib: "def-dirty" },
      assets_hash: hashDirectory(dir),
    });
  });
});
