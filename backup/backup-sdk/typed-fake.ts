import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "backup-spec";

export const { createHandler: backupHandler } =
  typedCreateHandler<paths>({
    subdomain: "backup",
  });
