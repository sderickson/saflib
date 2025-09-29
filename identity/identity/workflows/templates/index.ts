import { startIdentityService } from "@saflib/identity";
import { callbacks } from "./callbacks.ts";

export const start__ServiceName__IdentityService = () => {
  startIdentityService({
    dbOptions: {
      onDisk: true,
    },
    callbacks,
  });
};
