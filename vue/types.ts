import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";

/**
 * A subset of what `useQuery` returns. This is so that loaders can create pseudo-queries by simply creating objects with isLoading, error, and isError properties.
 */
export type LoaderQuery<TData = undefined> = Pick<
  UseQueryReturnType<any, TanstackError>,
  "isLoading" | "error"
> & {
  isError: Ref<boolean>;
  data: TData;
};

/**
 * A record of loader queries.
 */
export type LoaderQueries = Record<string, LoaderQuery<any>>;
