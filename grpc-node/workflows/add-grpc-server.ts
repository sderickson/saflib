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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const execAsync = promisify(exec);

interface AddGrpcServerWorkflowInput {}

interface AddGrpcServerWorkflowContext extends WorkflowContext {
  serviceName: string; // e.g. "api"
  pascalServiceName: string; // e.g. "Auth"
  sourceDir: string; // template directory
  grpcFilePath: string; // path to grpc.ts file
  contextFilePath: string; // path to context.ts file
  runFilePath: string; // path to bin/run.ts file
  packageJsonPath: string; // path to package.json
}

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

export const AddGrpcServerWorkflowMachine = setup({
  types: {
    input: {} as AddGrpcServerWorkflowInput,
    context: {} as AddGrpcServerWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-grpc-server",
  description: "Add a gRPC server to an existing Express.js service.",
  initial: "getOriented",
  context: (_) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "grpc-server-template");
    const cwd = process.cwd();

    // Determine service name from current directory
    const rawServiceName = path.basename(cwd);
    const serviceName = rawServiceName.replace(/-service$/, ""); // Remove "-service" suffix
    const pascalServiceName = toPascalCase(serviceName); // e.g. "auth" -> "Auth"

    const grpcFilePath = path.join(cwd, "grpc.ts");
    const contextFilePath = path.join(cwd, "context.ts");
    const runFilePath = path.join(cwd, "bin/run.ts");
    const packageJsonPath = path.join(cwd, "package.json");

    return {
      serviceName,
      pascalServiceName,
      sourceDir,
      grpcFilePath,
      contextFilePath,
      runFilePath,
      packageJsonPath,
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began add-grpc-server workflow"),
  states: {
    getOriented: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `This workflow will add a gRPC server to the existing Express.js service "${context.serviceName}".
                
                Steps:
                1. Install @saflib/grpc-node dependency
                2. Create grpc.ts file with makeGrpcServer function
                3. Update bin/run.ts to start the gRPC server
                
                Current directory: ${process.cwd()}`,
            ),
          ],
        },
        continue: {
          target: "installDependency",
        },
      },
    },
    installDependency: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async () => {
          try {
            const { stdout } = await execAsync("npm install @saflib/grpc-node");
            return stdout;
          } catch (error) {
            // Only fail if the command actually failed (non-zero exit code)
            throw new Error(
              `Failed to install dependency: ${(error as Error).message}`,
            );
          }
        }),
        onDone: {
          target: "checkContext",
          actions: logInfo(() => `Installed @saflib/grpc-node dependency.`),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to install dependency: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to install @saflib/grpc-node. Please check npm is available and try again.",
          ),
        },
        continue: {
          reenter: true,
          target: "installDependency",
        },
      },
    },
    checkContext: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { contextFilePath } = input;
          if (!existsSync(contextFilePath)) {
            throw new Error("context.ts file not found");
          }
          return "Context file exists";
        }),
        onDone: {
          target: "createGrpcFile",
          actions: logInfo(() => `Found existing context.ts file.`),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Context check failed: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            ({ context }) =>
              `The context.ts file was not found at ${context.contextFilePath}. This workflow assumes an existing Express app with a context.ts file. Please create the context.ts file or run this workflow from the correct directory.`,
          ),
        },
        continue: {
          reenter: true,
          target: "checkContext",
        },
      },
    },
    createGrpcFile: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const {
            grpcFilePath,
            serviceName,
            pascalServiceName,
            sourceDir,
            contextFilePath,
          } = input;

          if (existsSync(grpcFilePath)) {
            throw new Error("grpc.ts file already exists");
          }

          // Read the context file to find the actual storage variable name
          const contextContent = await readFile(contextFilePath, "utf-8");
          const storageMatch = contextContent.match(
            /export const (\w+ServiceStorage)/,
          );
          if (!storageMatch) {
            throw new Error(
              "Could not find ServiceStorage export in context.ts file",
            );
          }
          const actualStorageName = storageMatch[1];

          // Read the template
          const templatePath = path.join(sourceDir, "grpc.ts");
          const template = await readFile(templatePath, "utf-8");

          // Replace placeholders
          const content = template
            .replace(/SERVICE_NAME/g, serviceName)
            .replace(/SERVICE_NAMEDb/g, `${serviceName}Db`)
            .replace(/SERVICE_NAMEServiceStorage/g, actualStorageName)
            .replace(
              /addSERVICE_NAMEServiceContext/g,
              `add${pascalServiceName}ServiceContext`,
            );

          await writeFile(grpcFilePath, content);
          return "Created grpc.ts";
        }),
        onDone: {
          target: "updateRunFile",
          actions: logInfo(
            ({ context }) => `Created grpc.ts file at ${context.grpcFilePath}.`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to create grpc.ts: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            ({ context }) =>
              `Failed to create grpc.ts file. The file may already exist at ${context.grpcFilePath} or there may be permission issues.`,
          ),
        },
        continue: {
          reenter: true,
          target: "createGrpcFile",
        },
      },
    },
    updateRunFile: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the bin/run.ts file at ${context.runFilePath} to start the gRPC server:
                
                1. Import the makeGrpcServer function: import { makeGrpcServer } from "../grpc.ts";
                2. Import startGrpcServer: import { startGrpcServer } from "@saflib/grpc-node";
                3. In the main function, add:
                   - const grpcServer = makeGrpcServer({ dbKey });
                   - startGrpcServer(grpcServer);
                
                Look at the existing services/api/bin/run.ts and services/cron/bin/run.ts for examples.`,
            ),
          ],
        },
        continue: {
          target: "done",
        },
      },
    },
    done: {
      type: "final",
      entry: logInfo(
        ({ context }) =>
          `Successfully added gRPC server to ${context.serviceName} service. 
          
          Files created/updated:
          - grpc.ts: Contains makeGrpcServer function
          - bin/run.ts: Updated to start gRPC server
          
          Next steps:
          - Add service implementations to grpc.ts
          - Define your gRPC service definitions and implementations`,
      ),
    },
  },
});

export class AddGrpcServerWorkflow extends XStateWorkflow {
  machine = AddGrpcServerWorkflowMachine;
  description = "Add a gRPC server to an existing Express.js service.";
  cliArguments = [];
}
