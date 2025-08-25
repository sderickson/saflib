// @ts-nocheck - TODO remove this line as part of workflow
import type { ScheduledExampleMachine } from "@your-org/your-db";
import { fromPromise, setup, waitFor, createActor } from "xstate";
import { throwError } from "@saflib/monorepo";
// import { yourDb } from "@your-org/your-db";
import { allChildrenSettled } from "@saflib/xstate";

export const makeExampleMachineMachine = setup({
  types: {
    input: {} as {
      scheduledExampleMachine: ScheduledExampleMachine;
    },
    context: {} as {
      scheduledExampleMachine: ScheduledExampleMachine;
    },
  },
  actors: {
    noop: fromPromise(async (_) => {}),
  },
}).createMachine({
  id: "example-machine",
  initial: "PENDING",
  context: ({ input }) => ({
    scheduledExampleMachine: input.scheduledExampleMachine,
  }),
  states: {
    PENDING: {
      on: {
        continue: {
          target: "PENDING",
          reenter: true,
        },
      },
      invoke: {
        input: ({ context: { scheduledExampleMachine } }) =>
          scheduledExampleMachine,
        src: fromPromise(async ({ input }) => {
          // TODO: Implement your machine logic here
          console.log("Processing:", input);
          return input;
        }),
        onDone: {
          target: "COMPLETE",
        },
        onError: {
          target: "ERROR",
          actions: ({ event }) => {
            console.error(event.error);
          },
        },
      },
    },
    COMPLETE: {
      type: "final",
      tags: ["success"],
    },
    ERROR: {
      type: "final",
      tags: ["error"],
    },
  },
});

export const continueStateForExampleMachine = async (
  scheduledExampleMachine: ScheduledExampleMachine,
): Promise<ScheduledExampleMachine> => {
  const input = {
    scheduledExampleMachine: {
      ...scheduledExampleMachine,
    },
  };
  const machine = createActor(makeExampleMachineMachine, {
    snapshot: scheduledExampleMachine.machineSnapshot as any,
    input: scheduledExampleMachine.machineSnapshot ? undefined : input,
  });
  machine.start();
  if (scheduledExampleMachine.machineSnapshot) {
    machine.send({ type: "continue" });
  }
  await waitFor(machine, allChildrenSettled);
  const snapshot = machine.getSnapshot();
  const persistedSnapshot = machine.getPersistedSnapshot();
  // TODO: Update this to use the correct database query for your entity type
  // Example: mainDb.scheduledExampleMachines.update(dbKey, { ... })
  console.log("Machine completed with state:", snapshot.value);
  console.log("Persisted snapshot:", persistedSnapshot);
  return {
    ...scheduledExampleMachine,
    status: snapshot.value as string,
    machineSnapshot: persistedSnapshot,
  };
};
