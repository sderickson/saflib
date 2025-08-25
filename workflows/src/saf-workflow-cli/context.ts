import { setupContext as setupCommanderContext } from "@saflib/commander";

interface SetupContextOptions {
  silentLogging?: boolean;
}

export const setupContext = (options: SetupContextOptions) => {
  setupCommanderContext({
    ...options,
    serviceName: "workflows",
  });
};
