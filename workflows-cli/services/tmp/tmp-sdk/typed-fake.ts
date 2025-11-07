import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "tmp-spec";

export const { createHandler: tmpHandler } =
  typedCreateHandler<paths>({
    subdomain: "tmp",
  });
