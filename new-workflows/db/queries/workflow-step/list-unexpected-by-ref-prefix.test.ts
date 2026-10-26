import { describe, it, expect, beforeAll, afterAll, beforeEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowRun } from "../workflow-run/create.ts";
import { createWorkflowStep } from "./create.ts";
import { updateResultWorkflowStep } from "./update-result.ts";
import { listUnexpectedByRefPrefixWorkflowStep } from "./list-unexpected-by-ref-prefix.ts";

const now = new Date("2026-09-13T12:00:00.000Z");
const later = new Date("2026-09-13T12:05:00.000Z");

describe("listUnexpectedByRefPrefixWorkflowStep", () => {
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

  async function runWithStep(
    workflowRef: string,
    created: Date,
    unexpectedFiles: string[] | null,
  ): Promise<string> {
    const { result: run } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: workflowRef,
      mode: "run",
      input: {},
      cwd: "/repo",
      agent_config: null,
      now: created,
    });
    assert(run);
    const { result: step } = await createWorkflowStep(dbKey, {
      run_id: run.id,
      step_index: 2,
      kind: "command",
      now: created,
    });
    assert(step);
    await updateResultWorkflowStep(dbKey, {
      id: step.id,
      status: "success",
      result: null,
      error: null,
      label: "npm run test",
      commit_hash: "abc123",
      unexpected_files: unexpectedFiles,
      now: created,
    });
    return run.id;
  }

  it("returns unexpected files from the latest run of each workflow under the prefix", async () => {
    await runWithStep("p/plans/a/phase-1.yaml", now, ["old.ts"]);
    const latest = await runWithStep("p/plans/a/phase-1.yaml", later, ["new.ts"]);
    await runWithStep("p/plans/a/phase-2.yaml", now, null);
    await runWithStep("elsewhere/phase-1.yaml", now, ["other.ts"]);

    const { result } = await listUnexpectedByRefPrefixWorkflowStep(dbKey, {
      workflow_ref_prefix: "p/plans/",
    });

    expect(result).toEqual([
      {
        workflow_ref: "p/plans/a/phase-1.yaml",
        run_id: latest,
        step_index: 2,
        label: "npm run test",
        commit_hash: "abc123",
        unexpected_files: ["new.ts"],
      },
    ]);
  });

  it("matches the prefix literally, not as a LIKE pattern", async () => {
    await runWithStep("p/plansXa/phase-1.yaml", now, ["x.ts"]);

    const { result } = await listUnexpectedByRefPrefixWorkflowStep(dbKey, {
      workflow_ref_prefix: "p/plans_",
    });

    expect(result).toEqual([]);
  });
});
