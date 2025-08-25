// @ts-nocheck - TODO remove this line as part of workflow
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { makeExampleMachineMachine } from "./example-machine.ts";
import { createActor, waitFor } from "xstate";
import type { DbKey } from "@saflib/drizzle-sqlite3";
// import { yourDb } from "@your-org/your-db";
import { throwError } from "@saflib/monorepo";
import { allChildrenSettled } from "@saflib/xstate";

describe("makeExampleMachineMachine", () => {
  let dbKey: DbKey;
  beforeEach(async () => {
    vi.useFakeTimers();
    dbKey = yourDb.connect();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.skip("should be in the PENDING state when created", async () => {
    // TODO: Create a test entity using the appropriate database call
    const scheduledExampleMachine = {
      id: 1,
      status: "PENDING",
      machineSnapshot: null,
      // TODO: Add other required fields for your entity
    };

    const machine = createActor(makeExampleMachineMachine, {
      input: {
        scheduledExampleMachine: scheduledExampleMachine as any,
      },
    });
    machine.start();

    // TODO: Add assertions for your specific machine behavior
    // expect(machine.getSnapshot().value).toBe("PENDING");
  });
});
