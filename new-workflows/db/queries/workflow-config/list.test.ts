import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowConfig } from "./create.ts";
import { listWorkflowConfig } from "./list.ts";

const t = (offsetSeconds: number) =>
  new Date(new Date("2026-09-13T12:00:00.000Z").getTime() + offsetSeconds * 1000);

describe("listWorkflowConfig", () => {
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

  it("returns configs newest first", async () => {
    await createWorkflowConfig(dbKey, {
      name: "first",
      config: { name: "first", steps: [] },
      created_by: "user-1",
      now: t(0),
    });
    await createWorkflowConfig(dbKey, {
      name: "second",
      config: { name: "second", steps: [] },
      created_by: "user-1",
      now: t(1),
    });

    const { result } = await listWorkflowConfig(dbKey);

    expect(result?.map((r) => r.name)).toEqual(["second", "first"]);
  });
});
