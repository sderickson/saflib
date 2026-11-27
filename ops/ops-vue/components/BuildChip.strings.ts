export const build_chip = {
  /** Short labels for well-known deployment names; others show as-is. */
  deploymentShort: {
    development: "dev",
    production: "prod",
  } as Record<string, string>,
  unknownDeployment: "build",
  rootLabel: "root",
  saflibLabel: "saflib",
  tooltip: "Deployed build",
};
