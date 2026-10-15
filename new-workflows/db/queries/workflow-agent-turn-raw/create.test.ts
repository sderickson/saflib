import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowAgentTurnRaw } from "./create.ts";
import { getByTurnIdWorkflowAgentTurnRaw } from "./get-by-turn-id.ts";

describe("createWorkflowAgentTurnRaw", () => {
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

  it("stores a turn's raw output", async () => {
    const { result, error } = await createWorkflowAgentTurnRaw(dbKey, {
      turn_id: "t1",
      output: '{"type":"system"}\n',
      omitted_chars: 0,
      created_at: new Date("2026-10-15T12:00:00.000Z"),
    });
    expect(error).toBeUndefined();
    expect(result).toMatchObject({ turn_id: "t1", output: '{"type":"system"}\n' });
  });

  it("reads it back by turn id, and returns undefined for a turn without one", async () => {
    await createWorkflowAgentTurnRaw(dbKey, {
      turn_id: "t1",
      output: "x",
      omitted_chars: 0,
      created_at: new Date("2026-10-15T12:00:00.000Z"),
    });
    expect((await getByTurnIdWorkflowAgentTurnRaw(dbKey, { turn_id: "t1" })).result?.output).toBe("x");
    expect((await getByTurnIdWorkflowAgentTurnRaw(dbKey, { turn_id: "nope" })).result).toBeUndefined();
  });
});
