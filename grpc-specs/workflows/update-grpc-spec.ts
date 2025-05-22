import { fromPromise, raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  type WorkflowContext,
  logError,
  promptAgent,
  XStateWorkflow,
} from "@saflib/workflows";
import { execSync } from "child_process";

interface UpdateGrpcSpecWorkflowInput {}

interface UpdateGrpcSpecWorkflowContext extends WorkflowContext {}

export const UpdateGrpcSpecWorkflowMachine = setup({
  types: {
    input: {} as UpdateGrpcSpecWorkflowInput,
    context: {} as UpdateGrpcSpecWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "update-grpc-spec",
  description: "Update gRPC specification files",
  initial: "getOriented",
  context: (_) => {
    return {
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    getOriented: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              () =>
                `Read the existing proto files in the protos/ directory and read the project spec, understand what needs to be changed or added. Confirm your understanding.`,
            ),
          ],
        },
        continue: {
          target: "updateProtoFiles",
        },
      },
    },
    updateProtoFiles: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              () =>
                `Add or modify .proto files in the "protos" folder. Define your message types, services, and RPC methods according to Protocol Buffers syntax. Make sure to use the SAF common objects: SafRequest, SafAuth, and SafError.`,
            ),
          ],
        },
        continue: {
          target: "generateTypes",
        },
      },
    },
    generateTypes: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(
          async ({ input: _ }: { input: UpdateGrpcSpecWorkflowContext }) => {
            try {
              execSync("npm run generate", {
                stdio: "inherit",
                cwd: process.cwd(),
              });
              return "success";
            } catch (error) {
              throw new Error(`Failed to generate TypeScript files: ${error}`);
            }
          },
        ),
        onDone: {
          target: "done",
          actions: logInfo(
            () => `TypeScript files generated successfully from proto files.`,
          ),
        },
        onError: {
          actions: [
            logError(({ event }) => `Generation failed: ${event.error}`),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `The TypeScript generation failed. This usually means there's a syntax error in one of the proto files. Please check the error message above and fix any issues in the proto files, then continue.`,
          ),
        },
        continue: {
          reenter: true,
          target: "generateTypes",
        },
      },
    },
    done: {
      type: "final",
    },
  },
});

export class UpdateGrpcSpecWorkflow extends XStateWorkflow {
  machine = UpdateGrpcSpecWorkflowMachine;
  description = "Update gRPC specification files";
  cliArguments = [];
}
