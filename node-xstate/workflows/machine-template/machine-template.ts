import type { ScheduledMachineTemplate } from "@your-org/your-db";
import { fromPromise, setup, waitFor, createActor } from "xstate";
import { throwError } from "@saflib/monorepo";
import { yourDb } from "@your-org/your-db";
import { allChildrenSettled } from "@saflib/node-xstate";

export const makeMachineTemplateMachine = setup({
  types: {
    input: {} as {
      scheduledMachineTemplate: ScheduledMachineTemplate;
    },
    context: {} as {
      scheduledMachineTemplate: ScheduledMachineTemplate;
    },
  },
  actors: {
    noop: fromPromise(async (_) => {}),
  },
}).createMachine({
  id: "machine-template",
  initial: "PENDING",
  context: ({ input }) => ({
    scheduledMachineTemplate: input.scheduledMachineTemplate,
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
        input: ({ context: { scheduledMachineTemplate } }) =>
          scheduledMachineTemplate,
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

export const continueStateForMachineTemplate = async (
  scheduledMachineTemplate: ScheduledMachineTemplate,
): Promise<ScheduledMachineTemplate> => {
  const input = {
    scheduledMachineTemplate: {
      ...scheduledMachineTemplate,
    },
  };
  const machine = createActor(makeMachineTemplateMachine, {
    snapshot: scheduledMachineTemplate.machineSnapshot as any,
    input: scheduledMachineTemplate.machineSnapshot ? undefined : input,
  });
  machine.start();
  if (scheduledMachineTemplate.machineSnapshot) {
    machine.send({ type: "continue" });
  }
  await waitFor(machine, allChildrenSettled);
  const snapshot = machine.getSnapshot();
  const persistedSnapshot = machine.getPersistedSnapshot();
  // TODO: Update this to use the correct database query for your entity type
  // Example: mainDb.scheduledMachineTemplates.update(dbKey, { ... })
  console.log("Machine completed with state:", snapshot.value);
  console.log("Persisted snapshot:", persistedSnapshot);
  return {
    ...scheduledMachineTemplate,
    status: snapshot.value as string,
    machineSnapshot: persistedSnapshot,
  };
};
