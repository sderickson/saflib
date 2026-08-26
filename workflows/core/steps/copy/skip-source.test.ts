import { describe, expect, it } from "vitest";
import {
  DEFAULT_SKIP_SOURCE_GLOBS,
  shouldSkipSourcePath,
} from "./copy-template-machine.ts";
import type { CopyStepInput } from "./types.ts";

function skipInput(overrides: Partial<CopyStepInput> = {}): CopyStepInput {
  return {
    targetDir: "/tmp/target",
    ...overrides,
  };
}

describe("DEFAULT_SKIP_SOURCE_GLOBS", () => {
  it("skips local saf-workflow-status snapshots by default", () => {
    expect(DEFAULT_SKIP_SOURCE_GLOBS).toContain("**/saf-workflow-status.json");
    expect(DEFAULT_SKIP_SOURCE_GLOBS).toContain(
      "**/saf-workflow-status.error.json",
    );
  });
});

describe("shouldSkipSourcePath", () => {
  it("skips saf-workflow-status files under any package", () => {
    expect(
      shouldSkipSourcePath(
        "/repo/base/clients/admin/saf-workflow-status.json",
        skipInput(),
      ),
    ).toBe(true);
    expect(
      shouldSkipSourcePath(
        "/repo/saf-workflow-status.error.json",
        skipInput(),
      ),
    ).toBe(true);
  });

  it("does not skip ordinary source files", () => {
    expect(
      shouldSkipSourcePath("/repo/base/clients/admin/router.ts", skipInput()),
    ).toBe(false);
  });
});
