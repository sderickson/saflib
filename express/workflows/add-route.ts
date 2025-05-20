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

interface AddRouteWorkflowInput {
  path: string; // kebab-case, e.g. "routes/call-series/create-call-series.ts"
}

interface AddRouteWorkflowContext extends WorkflowContext {
  name: string; // e.g. "create-call-series"
  camelName: string; // e.g. createCallSeries
  targetDir: string; // e.g. "/<abs-path>/routes/call-series/"
  sourceDir: string; // e.g. "/<abs-path>/route-template/"
  refDoc: string;
  testingGuide: string;
  featureName: string; // e.g. "call-series"
  featureRouterPath: string; // e.g. "/<abs-path>/routes/call-series/index.ts"
  mainRouterPath: string; // e.g. "/<abs-path>/routes/index.ts"
  httpAppPath: string; // e.g. "/<abs-path>/http.ts"
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

export const AddRouteWorkflowMachine = setup({
  types: {
    input: {} as AddRouteWorkflowInput,
    context: {} as AddRouteWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-route",
  description: "Add a new route to an Express.js service.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "route-template");
    const targetDir = path.dirname(path.join(process.cwd(), input.path));
    const refDoc = path.resolve(__dirname, "../docs/02-adding-routes.md");
    const testingGuide = path.resolve(
      __dirname,
      "../../node-express-dev/docs/01-test-routes.md",
    );
    const featureName = path.basename(targetDir);
    const featureRouterPath = path.join(targetDir, "index.ts");
    const mainRouterPath = path.join(process.cwd(), "routes", "index.ts");
    const httpAppPath = path.join(process.cwd(), "http.ts");

    return {
      name: path.basename(input.path).split(".")[0],
      camelName: toCamelCase(path.basename(input.path).split(".")[0]),
      targetDir,
      sourceDir,
      refDoc,
      testingGuide,
      featureName,
      featureRouterPath,
      mainRouterPath,
      httpAppPath,
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
                `Read the reference documentation for adding routes: ${context.refDoc}

                This workflow will help you add a new route handler for ${context.name}. The route will be created in ${context.targetDir}.`,
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
            if (!file.includes("route-template")) {
              continue;
            }
            const oldPath = path.join(targetDir, file);
            const newPath = path.join(
              targetDir,
              file.replace("route-template", name),
            );
            await rename(oldPath, newPath);
            const content = await readFile(newPath, "utf-8");
            const updatedContent = content
              .replace(/routeTemplate/g, camelName)
              .replace(/route-template/g, name)
              .replace(/RouteTemplate/g, camelName);
            await writeFile(newPath, updatedContent);
          }

          return "Renamed placeholders";
        }),
        onDone: {
          target: "checkFeatureRouter",
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
    checkFeatureRouter: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { featureRouterPath, featureName } = input;
          if (!existsSync(featureRouterPath)) {
            const routerContent = `import express from "express";
import { ${input.camelName}Handler } from "./${input.name}.ts";

const router = express.Router();

router.post("/", ${input.camelName}Handler);

export default router;
`;
            await writeFile(featureRouterPath, routerContent);
            return "Created feature router";
          }
          return "Feature router exists";
        }),
        onDone: {
          target: "updateFeatureRouter",
          actions: logInfo(
            ({ event }) => `Feature router status: ${event.output}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to check/create feature router: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to check or create the feature router. Please check file permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "checkFeatureRouter",
        },
      },
    },
    updateFeatureRouter: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the feature router at ${context.featureRouterPath} to include the new route handler.
                1. Import the new handler from "./${context.name}.ts"
                2. Add the route to the router using the appropriate HTTP method
                3. Make sure to export the router as default`,
            ),
          ],
        },
        continue: {
          target: "checkMainRouter",
        },
      },
    },
    checkMainRouter: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { mainRouterPath, featureName } = input;
          if (!existsSync(mainRouterPath)) {
            const routerContent = `import express from "express";
import ${featureName}Router from "./${featureName}/index.ts";

const router = express.Router();

router.use("/${featureName}", ${featureName}Router);

export default router;
`;
            await writeFile(mainRouterPath, routerContent);
            return "Created main router";
          }
          return "Main router exists";
        }),
        onDone: {
          target: "updateMainRouter",
          actions: logInfo(
            ({ event }) => `Main router status: ${event.output}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to check/create main router: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to check or create the main router. Please check file permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "checkMainRouter",
        },
      },
    },
    updateMainRouter: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the main router at ${context.mainRouterPath} to include the feature router.
                1. Import the feature router from "./${context.featureName}/index.ts"
                2. Add the route using router.use("/${context.featureName}", ${context.featureName}Router)
                3. Make sure to export the router as default`,
            ),
          ],
        },
        continue: {
          target: "checkHttpApp",
        },
      },
    },
    checkHttpApp: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { httpAppPath } = input;
          if (!existsSync(httpAppPath)) {
            const appContent = `import express from "express";
import mainRouter from "./routes/index.ts";
import { preMiddleware, errorHandlers } from "./middleware.ts";

export function createApiApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(preMiddleware);
  app.use(mainRouter);
  app.use(errorHandlers);

  return app;
}
`;
            await writeFile(httpAppPath, appContent);
            return "Created HTTP app";
          }
          return "HTTP app exists";
        }),
        onDone: {
          target: "updateHttpApp",
          actions: logInfo(({ event }) => `HTTP app status: ${event.output}`),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to check/create HTTP app: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to check or create the HTTP app. Please check file permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "checkHttpApp",
        },
      },
    },
    updateHttpApp: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the HTTP app at ${context.httpAppPath} to use the main router.
                1. Import the main router from "./routes/index.ts"
                2. Add the router using app.use(mainRouter)
                3. Make sure to export the createApiApp function`,
            ),
          ],
        },
        continue: {
          target: "implementRoute",
        },
      },
    },
    implementRoute: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Implement the ${context.camelName} route handler. Make sure to:
                1. Use createHandler from @saflib/express
                2. Use types from your OpenAPI spec for request/response bodies
                3. Handle expected errors from service/DB layers
                4. Let unexpected errors propagate to central error handler
                5. Follow the pattern in the reference doc
                6. Export the handler from the folder's "index.ts" file`,
            ),
          ],
        },
        continue: {
          target: "reviewTestDocs",
        },
      },
    },
    reviewTestDocs: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Read the testing guide: ${context.testingGuide}

                Update the generated ${context.name}.test.ts file to follow these guidelines:
                1. Use supertest for making requests
                2. Test against the actual app with middleware
                3. Only mock expensive/external operations
                4. For success cases: check status and response body structure
                5. For error cases: only check status code
                6. Keep tests minimal and focused`,
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

export class AddRouteWorkflow extends XStateWorkflow {
  machine = AddRouteWorkflowMachine;
  description = "Add a new route to an Express.js service.";
  cliArguments = [
    {
      name: "path",
      description: "Path of the new route (e.g. 'routes/call-series/create')",
    },
  ];
}
