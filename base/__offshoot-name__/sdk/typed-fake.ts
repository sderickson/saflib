import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "@saflib/base-__offshoot-name__-spec";

/** Local MSW helper for this offshoot's fake request handlers. */
export const { createHandler: baseHandler } =
  typedCreateHandler<paths>();
