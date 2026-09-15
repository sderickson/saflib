import { describe, it, expect, beforeAll, afterAll, beforeEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowRun } from "./create.ts";
import { listByWorkflowRefWorkflowRun } from "./list-by-workflow-ref.ts";

const now = new Date("2026-09-13T12:00:00.000Z");
const later = new Date("2026-09-13T12:05:00.000Z");

describe("listByWorkflowRefWorkflowRun", () => {
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

  it("returns only runs for the given workflow_ref, newest first", async () => {
    const { result: first } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: "example/hello",
      mode: "script",
      input: {},
      cwd: "/tmp/example",
      agent_config: null,
      now,
    });
    assert(first);
    const { result: second } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: "example/hello",
      mode: "script",
      input: {},
      cwd: "/tmp/example",
      agent_config: null,
      now: later,
    });
    assert(second);
    const { result: other } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: "example/other",
      mode: "script",
      input: {},
      cwd: "/tmp/example",
      agent_config: null,
      now,
    });
    assert(other);

    const { result, error } = await listByWorkflowRefWorkflowRun(dbKey, {
      workflow_ref: "example/hello",
    });

    expect(error).toBeUndefined();
    expect(result?.map((r) => r.id)).toEqual([second.id, first.id]);
  });

  it("returns an empty array when nothing matches", async () => {
    const { result, error } = await listByWorkflowRefWorkflowRun(dbKey, {
      workflow_ref: "no/such-workflow",
    });

    expect(error).toBeUndefined();
    expect(result).toEqual([]);
  });
});
