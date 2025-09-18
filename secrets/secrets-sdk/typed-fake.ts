import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "@saflib/secrets-spec";

export const { createHandler: secretsHandler } = typedCreateHandler<paths>(
  {
    subdomain: "secrets",
  },
);
