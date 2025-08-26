import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { TanstackError } from "@saflib/vue";
import type { Ref } from "vue";

export type LoaderQuery = Pick<
  UseQueryReturnType<any, TanstackError>,
  "isLoading" | "error"
> & {
  isError: Ref<boolean>;
};

export type LoaderQueries = Record<string, LoaderQuery>;
