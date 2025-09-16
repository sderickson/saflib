import { startIdentityService } from "@saflib/identity";
import { callbacks } from "./callbacks.ts";

export const startFileTemplateIdentityService = () => {
  startIdentityService({
    dbOptions: {
      onDisk: true,
    },
    callbacks,
  });
};
