import { typedCreateHandler } from "@saflib/vue/testing";
import type { paths } from "@saflib/identity-spec";

export const { createHandler: createIdentityHandler } =
  typedCreateHandler<paths>({ subdomain: "identity" });
