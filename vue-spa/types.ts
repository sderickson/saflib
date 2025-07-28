import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { TanstackError } from "@saflib/vue-spa";

export type LoaderQuery = Pick<
  UseQueryReturnType<any, TanstackError>,
  "isLoading" | "isError" | "error"
>;
