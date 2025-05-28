import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { makeMachineTemplateMachine } from "./machine-template.ts";
import { createActor, waitFor } from "xstate";
import type { DbKey } from "@saflib/drizzle-sqlite3";
// import { yourDb } from "@your-org/your-db";
import { throwError } from "@saflib/monorepo";
import { allChildrenSettled } from "@saflib/node-xstate";

describe("makeMachineTemplateMachine", () => {
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
    const scheduledMachineTemplate = {
      id: 1,
      status: "PENDING",
      machineSnapshot: null,
      // TODO: Add other required fields for your entity
    };

    const machine = createActor(makeMachineTemplateMachine, {
      input: {
        scheduledMachineTemplate: scheduledMachineTemplate as any,
      },
    });
    machine.start();

    // TODO: Add assertions for your specific machine behavior
    // expect(machine.getSnapshot().value).toBe("PENDING");
  });
});
