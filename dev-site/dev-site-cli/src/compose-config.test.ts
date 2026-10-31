import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { resolveComposeInvocation, WORKTREE_OVERLAY_FILE } from "./compose-config.ts";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});

describe("resolveComposeInvocation worktree overlay", () => {
  beforeEach(() => {
    vol.reset();
  });
  afterEach(() => {
    vol.reset();
  });

  const devFiles = (root: string, stack = "services:\n  site:\n    image: x\n") => ({
    [`${root}/saflib/base/.gitkeep`]: "",
    [`${root}/my-product/dev/docker-compose.yaml`]: stack,
    [`${root}/my-product/dev/${WORKTREE_OVERLAY_FILE}`]: "",
  });

  it("adds the overlay to both stacks in a worktree checkout", () => {
    vol.fromJSON(
      {
        "/main/.git/worktrees/feature/commondir": "../..\n",
        "/feature/.git": "gitdir: /main/.git/worktrees/feature\n",
        ...devFiles("/feature"),
      },
      "/",
    );
    for (const kind of ["stack", "dev-site"] as const) {
      expect(
        resolveComposeInvocation("/feature/my-product/dev", kind).composeFiles,
      ).toContain(WORKTREE_OVERLAY_FILE);
    }
  });

  it("leaves the overlay out of a stack without the site service", () => {
    vol.fromJSON(
      {
        "/main/.git/worktrees/feature/commondir": "../..\n",
        "/feature/.git": "gitdir: /main/.git/worktrees/feature\n",
        ...devFiles("/feature", "services:\n  caddy:\n    image: x\n"),
      },
      "/",
    );
    expect(
      resolveComposeInvocation("/feature/my-product/dev", "stack").composeFiles,
    ).toEqual(["docker-compose.yaml"]);
    expect(
      resolveComposeInvocation("/feature/my-product/dev", "dev-site").composeFiles,
    ).toContain(WORKTREE_OVERLAY_FILE);
  });

  it("leaves the overlay out of a main checkout", () => {
    vol.fromJSON(
      { "/main/.git/HEAD": "ref: refs/heads/main\n", ...devFiles("/main") },
      "/",
    );
    expect(
      resolveComposeInvocation("/main/my-product/dev", "stack").composeFiles,
    ).toEqual(["docker-compose.yaml"]);
  });
});
