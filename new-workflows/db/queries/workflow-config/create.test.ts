import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowConfig } from "./create.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("createWorkflowConfig", () => {
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

  it("creates a config row", async () => {
    const { result, error } = await createWorkflowConfig(dbKey, {
      name: "Say hello",
      config: { name: "Say hello", steps: [{ kind: "prompt", prompt: "hi" }] },
      created_by: "user-1",
      now,
    });

    expect(error).toBeUndefined();
    expect(result?.name).toBe("Say hello");
    expect(result?.config).toEqual({
      name: "Say hello",
      steps: [{ kind: "prompt", prompt: "hi" }],
    });
  });
});
