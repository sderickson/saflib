import { identityServiceFakeHandlers } from "@saflib/auth/fakes";
import { backupsFakeHandlers } from "./requests/backups/index.fakes.ts";

export const backupServiceFakeHandlers = [
  ...identityServiceFakeHandlers,
  ...backupsFakeHandlers,
];
