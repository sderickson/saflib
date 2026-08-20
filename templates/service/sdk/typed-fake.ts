import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "@saflib/templates-spec";

export const { createHandler: templatesHandler } =
  typedCreateHandler<paths>();
