import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import path from "node:path";
import { resolveDevLayout } from "./layout.ts";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});

describe("resolveDevLayout", () => {
  beforeEach(() => {
    vol.reset();
  });
  afterEach(() => {
    vol.reset();
  });

  it("detects product monorepo layout", () => {
    const root = "/repo";
    vol.fromJSON(
      {
        [`${root}/saflib/base/.gitkeep`]: "",
        [`${root}/daemon/dev/docker-compose.yaml`]: "",
      },
      "/",
    );
    const layout = resolveDevLayout(`${root}/daemon/dev`);
    expect(layout.repoMount).toBe(root);
    expect(layout.productRoot).toBe("daemon");
    expect(layout.containerSaflibRoot).toBe("/repo/saflib");
    expect(layout.gitDirMount).toBeUndefined();
  });

  it("detects saflib base layout", () => {
    const saflib = "/saflib";
    vol.fromJSON(
      {
        [`${saflib}/base/dev/docker-compose.yaml`]: "",
      },
      "/",
    );
    const layout = resolveDevLayout(`${saflib}/base/dev`);
    expect(layout.repoMount).toBe(saflib);
    expect(layout.productRoot).toBe("base");
    expect(layout.containerSaflibRoot).toBe("/repo");
  });

  it("sets git dir overlay only when /repo is saflib with gitfile", () => {
    const parent = "/parent";
    const saflib = path.join(parent, "saflib");
    vol.fromJSON(
      {
        [`${saflib}/base/dev/docker-compose.yaml`]: "",
        [`${saflib}/.git`]: "gitdir: ../.git/modules/saflib\n",
        [`${parent}/.git/modules/saflib/HEAD`]: "ref: refs/heads/main\n",
      },
      "/",
    );
    const layout = resolveDevLayout(`${saflib}/base/dev`);
    expect(layout.gitDirMount).toBe(`${parent}/.git/modules/saflib`);
  });
});
