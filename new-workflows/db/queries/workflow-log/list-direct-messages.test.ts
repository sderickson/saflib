import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { appendWorkflowLog } from "./append.ts";
import { listDirectMessagesWorkflowLog } from "./list-direct-messages.ts";

const MARKER = "Direct agent message (does not advance the workflow)";
const now = new Date("2026-09-13T12:00:00.000Z");

async function log(
  dbKey: DbKey,
  channel: "tool" | "agent-input" | "agent",
  content: string,
  run_id = "run-1",
  step_index = 0,
) {
  await appendWorkflowLog(dbKey, { run_id, step_index, channel, level: "info", content, now });
}

describe("listDirectMessagesWorkflowLog", () => {
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

  it("returns only the agent-input rows that follow a marker, oldest first", async () => {
    await log(dbKey, "agent-input", "step prompt");
    await log(dbKey, "agent", "working");
    await log(dbKey, "tool", MARKER);
    await log(dbKey, "agent-input", "first dm");
    await log(dbKey, "agent", "reply");
    await log(dbKey, "tool", MARKER, "run-2");
    await log(dbKey, "agent-input", "other run dm", "run-2");
    await log(dbKey, "tool", MARKER, "run-1", 1);
    await log(dbKey, "agent-input", "second dm", "run-1", 1);

    const { result } = await listDirectMessagesWorkflowLog(dbKey, {
      run_id: "run-1",
      marker: MARKER,
    });

    expect(result?.map((r) => [r.content, r.step_index])).toEqual([
      ["first dm", 0],
      ["second dm", 1],
    ]);
    expect(result![0]!.seq).toBeLessThan(result![1]!.seq);
  });
});
