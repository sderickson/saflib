import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { InitIntegrationWorkflowDefinition } from "./init-integration.ts";

describe("integrations/init (ported to the new engine)", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
  });

  it("scaffolds from a monorepo-root path and weaves configure into common", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "integrations-init-"));
    const commonDir = path.join(root, "power-up", "service", "common");
    mkdirSync(commonDir, { recursive: true });
    writeFileSync(
      path.join(commonDir, "package.json"),
      JSON.stringify(
        {
          name: "@vendata/power-up-service-common",
          private: true,
          type: "module",
          dependencies: {},
        },
        null,
        2,
      ) + "\n",
    );
    writeFileSync(
      path.join(commonDir, "dependencies.ts"),
      `// BEGIN WORKFLOW AREA integration-imports FOR integrations/init
// END WORKFLOW AREA

export async function initializeDependencies(): Promise<void> {
  // BEGIN WORKFLOW AREA integration-configure FOR integrations/init
  // END WORKFLOW AREA
}
`,
    );

    const runId = await createRun(dbKey, InitIntegrationWorkflowDefinition, {
      input: { path: "power-up/service/integrations/mercury" },
      cwd: root,
      mode: "script",
    });

    // Drive through the two copy steps (then stop at cd/touch/prompt…).
    for (let i = 0; i < 2; i++) {
      const { output, result } = advanceRun(dbKey, InitIntegrationWorkflowDefinition, runId);
      await collectOutput(output);
      const outcome = await result;
      expect(outcome.status).toBe("success");
    }

    const clientPath = path.join(
      root,
      "power-up",
      "service",
      "integrations",
      "mercury",
      "client.ts",
    );
    expect(existsSync(clientPath)).toBe(true);
    expect(readFileSync(clientPath, "utf-8")).toContain("configureMercury");
    expect(
      readFileSync(
        path.join(root, "power-up/service/integrations/mercury/package.json"),
        "utf-8",
      ),
    ).toContain("@vendata/power-up-mercury-integration");

    const deps = readFileSync(path.join(commonDir, "dependencies.ts"), "utf-8");
    expect(deps).toContain(
      'import { configureMercury } from "@vendata/power-up-mercury-integration"',
    );
    expect(deps).toContain("await configureMercury(");
  });

  it("rejects paths that are not {product}/service/integrations/{name}", async () => {
    const runId = await createRun(dbKey, InitIntegrationWorkflowDefinition, {
      input: { path: "power-up/service/common" },
      cwd: mkdtempSync(path.join(tmpdir(), "integrations-init-bad-")),
      mode: "script",
    });
    const { output, result } = advanceRun(dbKey, InitIntegrationWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("error");
    expect(outcome.message).toMatch(/service\/integrations/);
  });
});
