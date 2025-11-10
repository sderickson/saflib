import { startIdentityService } from "@saflib/identity";
import { callbacks } from "./callbacks.ts";
import path from "node:path";

export const start__ServiceName__IdentityService = () => {
  startIdentityService({
    dbPath: path.join(import.meta.dirname, "..", "data", "identity.db"),
    callbacks,
  });
};
