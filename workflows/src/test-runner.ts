import { fromPromise, raise } from "xstate";
import {
  logInfo,
  logError,
  promptAgent,
  doesTestPass,
  installSaflibEnv,
  generateEnv,
  generateAllEnv,
  type WorkflowContext,
} from "./xstate.ts";

interface RunTestsFactoryOptions<C extends WorkflowContext> {
  filePath: string | ((context: C) => string);
  stateName: string;
  nextStateName: string;
}

export function runTestsFactory<C extends WorkflowContext>({
  filePath,
  stateName,
  nextStateName,
}: RunTestsFactoryOptions<C>) {
  return {
    [stateName]: {
      invoke: {
        src: fromPromise(async ({ input }: { input: C }) => {
          const resolvedPath =
            typeof filePath === "string" ? filePath : filePath(input);
          return await doesTestPass(resolvedPath);
        }),
        input: ({ context }: { context: C }) => context,
        onDone: {
          target: nextStateName,
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
          target: stateName,
        },
      },
    },
  };
}

interface RunEnvCommandFactoryOptions<C extends WorkflowContext> {
  command: "install" | "generate" | "generate-all";
  stateName: string;
  nextStateName: string;
}

export function runEnvCommandFactory<C extends WorkflowContext>({
  command,
  stateName,
  nextStateName,
}: RunEnvCommandFactoryOptions<C>) {
  const getCommand = () => {
    switch (command) {
      case "install":
        return installSaflibEnv;
      case "generate":
        return generateEnv;
      case "generate-all":
        return generateAllEnv;
    }
  };

  const getSuccessMessage = () => {
    switch (command) {
      case "install":
        return "Successfully installed @saflib/env";
      case "generate":
        return "Successfully generated env.ts";
      case "generate-all":
        return "Successfully generated all env files";
    }
  };

  return {
    [stateName]: {
      invoke: {
        src: fromPromise(async () => {
          return await getCommand()();
        }),
        onDone: {
          target: nextStateName,
          actions: logInfo(() => getSuccessMessage()),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Command failed: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `The ${command} command failed. Please fix the issues and continue.`,
          ),
        },
        continue: {
          reenter: true,
          target: stateName,
        },
      },
    },
  };
}
