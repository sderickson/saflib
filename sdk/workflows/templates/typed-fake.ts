import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "template-package-spec";

export const { createHandler: __serviceName__Handler } =
  typedCreateHandler<paths>({
    subdomain: "__service-name__",
  });
