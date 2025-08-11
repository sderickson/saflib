import { fromPromise, raise } from "xstate";
import { logInfo, logError, promptAgent, runCommandAsync } from "./xstate.ts";

interface RunNpmCommandFactoryOptions {
  command:
    | "install @saflib/env"
    | "exec saf-env generate"
    | "exec saf-env generate-all";
  stateName: string;
  nextStateName: string;
}

export function runNpmCommandFactory({
  command,
  stateName,
  nextStateName,
}: RunNpmCommandFactoryOptions) {
  const getCommand = () => {
    return () => {
      return runCommandAsync("npm", command.split(" "));
    };
  };

  const getSuccessMessage = () => {
    return `Successfully ran ${command}`;
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
