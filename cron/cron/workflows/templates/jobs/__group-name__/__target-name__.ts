import { __serviceName__ServiceStorage } from "template-package-service-common";
import { getSafReporters } from "@saflib/node";

export const __targetName__ = async () => {
  const { __serviceName__DbKey: dbKey } =
    __serviceName__ServiceStorage.getStore()!;
  const { log } = getSafReporters();
  // TODO: Implement the job logic here
  log.info(`__targetName__ job running with dbKey: ${String(dbKey)}`);
};
