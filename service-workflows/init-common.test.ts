import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { InitCommonWorkflowDefinition } from "./init-common.ts";

describe("service/init-common (ported to the new engine)", () => {
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

  // See the KNOWN BROKEN comment in init-common.ts: `base/service/common/
  // dependencies.ts` has a `__integration-name__` placeholder only
  // `integrations/init` ever supplies, so a fresh copy always throws
  // during placeholder substitution — predating this port (the old
  // engine's identical `makeLineReplace` would throw the same way). This
  // test documents that current, pre-existing behavior rather than
  // asserting a success this workflow can't currently reach.
  it("fails on a fresh copy due to an unrelated pre-existing template/workflow coupling issue", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "service-init-common-"));

    const runId = await createRun(dbKey, InitCommonWorkflowDefinition, {
      input: { name: "widgets-service-common", path: "services/widgets-service-common" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, InitCommonWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome).toEqual({
      status: "error",
      message: "Missing replacement for __integration-name__",
    });
  });
});
