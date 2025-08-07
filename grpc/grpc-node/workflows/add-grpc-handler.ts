import { fromPromise, raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  type WorkflowContext,
  logError,
  promptAgent,
  XStateWorkflow,
  doTestsPass,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readdir, rename, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const execAsync = promisify(exec);

interface AddGrpcHandlerWorkflowInput {
  path: string; // kebab-case, e.g. "rpcs/user-reports/schedule-reports.ts"
}

interface AddGrpcHandlerWorkflowContext extends WorkflowContext {
  name: string; // e.g. "schedule-reports"
  camelName: string; // e.g. scheduleReports
  targetDir: string; // e.g. "/<abs-path>/rpcs/user-reports/"
  sourceDir: string; // e.g. "/<abs-path>/grpc-handler-template/"
  serviceName: string; // e.g. "user-reports"
  pascalServiceName: string; // e.g. "UserReports"
  serviceIndexPath: string; // e.g. "/<abs-path>/rpcs/user-reports/index.ts"
  grpcServerPath: string; // e.g. "/<abs-path>/grpc.ts"
}

function toCamelCase(name: string) {
  return name
    .split("-")
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function toPascalCase(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const AddGrpcHandlerWorkflowMachine = setup({
  types: {
    input: {} as AddGrpcHandlerWorkflowInput,
    context: {} as AddGrpcHandlerWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-grpc-handler",
  description: "Add a new gRPC handler to a service.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "grpc-handler-template");
    const targetDir = path.dirname(path.join(process.cwd(), input.path));
    const serviceName = path.basename(targetDir);
    const pascalServiceName = toPascalCase(serviceName);
    const serviceIndexPath = path.join(targetDir, "index.ts");
    const grpcServerPath = path.join(process.cwd(), "grpc.ts");

    return {
      name: path.basename(input.path).split(".")[0],
      camelName: toCamelCase(path.basename(input.path).split(".")[0]),
      targetDir,
      sourceDir,
      serviceName,
      pascalServiceName,
      serviceIndexPath,
      grpcServerPath,
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
              ({ context }) =>
                `This workflow will help you add a new gRPC handler '${context.name}' to the '${context.serviceName}' service. The handler will be created in ${context.targetDir}.

                Make sure you have:
                1. The gRPC service proto definition updated with your new RPC method
                2. The generated TypeScript types exported from the package with the proto

                Continue when ready.`,
            ),
          ],
        },
        continue: {
          target: "copyTemplate",
        },
      },
    },
    copyTemplate: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { targetDir, sourceDir } = input;
          await execAsync(`mkdir -p "${targetDir}"`);
          const { stdout, stderr } = await execAsync(
            `cp -r "${sourceDir}/"* "${targetDir}"`,
          );
          if (stderr) {
            throw new Error(`Failed to copy template: ${stderr}`);
          }
          return stdout;
        }),
        onDone: {
          target: "renamePlaceholders",
          actions: logInfo(
            ({ context }) => `Copied template files to ${context.targetDir}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to copy template: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to copy the template files. Please check if the source directory exists and you have the necessary permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "copyTemplate",
        },
      },
    },
    renamePlaceholders: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { targetDir, camelName, name } = input;

          // Get all files in the directory
          const files = await readdir(targetDir);
          for (const file of files) {
            if (!file.includes("grpc-handler-template")) {
              continue;
            }
            const oldPath = path.join(targetDir, file);
            const newPath = path.join(
              targetDir,
              file.replace("grpc-handler-template", name),
            );
            await rename(oldPath, newPath);
            const content = await readFile(newPath, "utf-8");
            const updatedContent = content
              .replace(/grpcHandlerTemplate/g, camelName)
              .replace(/grpc-handler-template/g, name)
              .replace(/GrpcHandlerTemplate/g, toPascalCase(name))
              .replace(/GrpcService/g, toPascalCase(input.pascalServiceName));
            await writeFile(newPath, updatedContent);
          }

          return "Renamed placeholders";
        }),
        onDone: {
          target: "checkServiceIndex",
          actions: logInfo(
            () => `Renamed all placeholders in files and file names.`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to rename placeholders: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to rename placeholders. Please check the file and directory permissions and naming conventions.",
          ),
        },
        continue: {
          reenter: true,
          target: "renamePlaceholders",
        },
      },
    },
    checkServiceIndex: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { serviceIndexPath, pascalServiceName, name } = input;
          if (!existsSync(serviceIndexPath)) {
            const indexContent = `import type { UntypedServiceImplementation } from "@grpc/grpc-js";
import { Unimplemented${pascalServiceName}Service } from "@your-org/rpcs";
import { handle${toPascalCase(name)} } from "./${name}.ts";

export const ${pascalServiceName}ServiceDefinition =
  Unimplemented${pascalServiceName}Service.definition;

export const ${pascalServiceName}ServiceImpl: UntypedServiceImplementation = {
  ${toPascalCase(name)}: handle${toPascalCase(name)},
};
`;
            await writeFile(serviceIndexPath, indexContent);
            return "Created service index";
          }
          return "Service index exists";
        }),
        onDone: {
          target: "updateServiceIndex",
          actions: logInfo(
            ({ event }) => `Service index status: ${event.output}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to check/create service index: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to check or create the service index. Please check file permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "checkServiceIndex",
        },
      },
    },
    updateServiceIndex: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the service index at ${context.serviceIndexPath} to include the new handler.
                1. Import the new handler: \`import { handle${toPascalCase(context.name)} } from "./${context.name}.ts";\`
                2. Add the handler to the service implementation object using the correct RPC method name from your proto definition
                3. Make sure the service definition and implementation are exported correctly`,
            ),
          ],
        },
        continue: {
          target: "checkGrpcServer",
        },
      },
    },
    checkGrpcServer: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { grpcServerPath } = input;
          if (!existsSync(grpcServerPath)) {
            throw new Error("grpc.ts not found in the current directory");
          }
          return "gRPC server exists";
        }),
        onDone: {
          target: "updateGrpcServer",
          actions: logInfo(
            ({ event }) => `gRPC server status: ${event.output}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to check gRPC server: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "grpc.ts not found in the current directory. Please create this file to register your gRPC services.",
          ),
        },
        continue: {
          reenter: true,
          target: "checkGrpcServer",
        },
      },
    },
    updateGrpcServer: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the gRPC server at ${context.grpcServerPath} to include the new service (if not already present):
                1. Import the service: \`import { ${context.pascalServiceName}ServiceDefinition, ${context.pascalServiceName}ServiceImpl } from "./rpcs/${context.serviceName}/index.ts";\`
                2. Add the service to the server: \`server.addService(${context.pascalServiceName}ServiceDefinition, wrap(${context.pascalServiceName}ServiceImpl));\`
                3. Make sure to add this before the server is returned`,
            ),
          ],
        },
        continue: {
          target: "implementHandler",
        },
      },
    },
    implementHandler: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Implement the ${context.camelName} gRPC handler. Make sure to:
                1. Import the correct request/response types from @your-org/rpcs
                2. Use the proper type annotation for the handler function
                3. Handle the request data appropriately
                4. Return proper response objects
                5. Handle errors gracefully with appropriate gRPC status codes
                6. Use getSafContext() for logging and other context data`,
            ),
          ],
        },
        continue: {
          target: "updateTests",
        },
      },
    },
    updateTests: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the generated ${context.name}.test.ts file to test your handler:
                1. Import necessary testing utilities from vitest
                2. Mock any external dependencies (databases, services, etc.)
                3. Test successful request handling
                4. Test error scenarios
                5. Verify callback is called with proper arguments
                6. Keep tests focused and minimal`,
            ),
          ],
        },
        continue: {
          target: "runTests",
        },
      },
    },
    runTests: {
      invoke: {
        src: fromPromise(doTestsPass),
        onDone: {
          target: "done",
          actions: logInfo(() => `Tests passed successfully.`),
        },
        onError: {
          actions: [
            logError(
              ({ event }) => `Tests failed: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () => "Tests failed. Please fix the issues and continue.",
          ),
        },
        continue: {
          reenter: true,
          target: "runTests",
        },
      },
    },
    done: {
      type: "final",
    },
  },
});

export class AddGrpcHandlerWorkflow extends XStateWorkflow {
  machine = AddGrpcHandlerWorkflowMachine;
  description = "Add a new gRPC handler to a service.";
  cliArguments = [
    {
      name: "path",
      description:
        "Path of the new handler (e.g. 'rpcs/user-reports/schedule-reports')",
    },
  ];
}
