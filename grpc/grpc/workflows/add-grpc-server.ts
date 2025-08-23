import { fromPromise, raise, setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  type WorkflowContext,
  logError,
  promptAgent,
  XStateWorkflow,
  contextFromInput,
  type WorkflowInput,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const execAsync = promisify(exec);

interface AddGrpcServerWorkflowInput extends WorkflowInput {}

interface AddGrpcServerWorkflowContext extends WorkflowContext {
  serviceName: string; // e.g. "api"
  pascalServiceName: string; // e.g. "Auth"
  rawServiceName: string; // Keep the original name for scope detection
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
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-grpc-server",
  description: "Add a gRPC server to an existing Express.js service.",
  initial: "getOriented",
  context: ({ input }) => {
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
      rawServiceName, // Keep the original name for scope detection
      sourceDir,
      grpcFilePath,
      contextFilePath,
      runFilePath,
      packageJsonPath,
      ...contextFromInput(input),
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
                1. Install @saflib/grpc dependency
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
            const { stdout } = await execAsync("npm install @saflib/grpc");
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
          actions: logInfo(() => `Installed @saflib/grpc dependency.`),
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
              "Failed to install @saflib/grpc. Please check npm is available and try again.",
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
            packageJsonPath,
          } = input;

          if (existsSync(grpcFilePath)) {
            throw new Error("grpc.ts file already exists");
          }

          // Read package.json to determine the scope
          let serviceScope = "@saflib"; // default fallback
          if (existsSync(packageJsonPath)) {
            try {
              const packageContent = await readFile(packageJsonPath, "utf-8");
              const packageJson = JSON.parse(packageContent);
              if (packageJson.name) {
                const scopeMatch = packageJson.name.match(/^(@[^/]+)/);
                if (scopeMatch) {
                  serviceScope = scopeMatch[1];
                }
              }
            } catch {
              // If we can't read package.json, use default scope
            }
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

          // Replace placeholders - do specific replacements first to avoid conflicts
          const content = template
            .replace(
              /addSERVICE_NAMEServiceContext/g,
              `add${pascalServiceName}ServiceContext`,
            )
            .replace(
              /@saflib\/dbs-SERVICE_NAME/g,
              `${serviceScope}/dbs-${serviceName}`,
            )
            .replace(/SERVICE_NAMEDb/g, `${serviceName}Db`)
            .replace(/SERVICE_NAMEServiceStorage/g, actualStorageName);

          await writeFile(grpcFilePath, content);
          return "Created grpc.ts";
        }),
        onDone: {
          target: "updateGrpcFile",
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
    updateGrpcFile: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the grpc.ts file at ${context.grpcFilePath} to make sure everything is in place and imported correctly. The file that was generated should largely be correct but not everything can be inferred ahead of time.`,
            ),
          ],
        },
        continue: {
          target: "updateRunFile",
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
                2. Import startGrpcServer: import { startGrpcServer } from "@saflib/grpc";
                3. In the main function, add:
                   - const grpcServer = makeGrpcServer({ dbKey });
                   - startGrpcServer(grpcServer);
                
                Look at the existing services/caller/bin/run.ts and services/cron/bin/run.ts for examples.`,
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
  sourceUrl = import.meta.url;
}
