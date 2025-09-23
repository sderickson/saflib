import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "example-spec";

export const { createHandler: exampleHandler } =
  typedCreateHandler<paths>({
    subdomain: "example",
  });
