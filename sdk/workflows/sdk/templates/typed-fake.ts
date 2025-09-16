import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "@template/file-spec";

export const { createHandler: templateFileHandler } = typedCreateHandler<paths>(
  {
    subdomain: "template-file",
  },
);
