import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "@saflib/base-spec";

export const { createHandler: baseHandler } =
  typedCreateHandler<paths>();
