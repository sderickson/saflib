import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runNpmScriptStep } from "./npm-script.ts";
import { makeTestContext } from "../test-helpers.ts";

function makeWorkspaceRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "npm-script-root-"));
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "root", workspaces: ["pkg"] }),
  );
  const pkgDir = path.join(root, "pkg");
  mkdirSync(pkgDir);
  writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name: "@fixture/pkg", scripts: { greet: "node -e \"console.log('hi')\"" } }),
  );
  return root;
}

describe("runNpmScriptStep", () => {
  it("errors when the workspace doesn't exist", async () => {
    const root = makeWorkspaceRoot();
    const { ctx } = makeTestContext({ mode: "run", originalWorkingDirectory: root });

    const result = await runNpmScriptStep(
      { workspace: "@fixture/does-not-exist", script: "greet" },
      ctx,
    );

    expect(result.status).toBe("error");
  });

  it("errors when the script doesn't exist on the workspace", async () => {
    const root = makeWorkspaceRoot();
    const { ctx } = makeTestContext({ mode: "run", originalWorkingDirectory: root });

    const result = await runNpmScriptStep(
      { workspace: "@fixture/pkg", script: "does-not-exist" },
      ctx,
    );

    expect(result.status).toBe("error");
  });
});
