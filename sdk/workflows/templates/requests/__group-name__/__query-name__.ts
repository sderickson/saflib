import { queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";

interface __QueryName____GroupName__QueryOptions {
  // TODO: Define the interface for the query. Use vue Ref types, e.g.
  // offset: Ref<number>;
  // limit: Ref<number>;
}

export const __queryName____GroupName__Query = (
  // @ts-expect-error TODO: remove or use options
  options: __QueryName____GroupName__QueryOptions,
) => {
  return queryOptions({
    // TODO: as appropriate, define query key based on the options
    queryKey: ["__group-name__", "__query-name__"],
    queryFn: async () =>
      handleClientMethod(
        // @ts-ignore TODO: update params to match the route
        getClient().__METHOD__(
          // @ts-ignore TODO: update params to match the route
          "__url-path__",
          {
            // @ts-ignore TODO: update params to match the route
            params: {
              // limit: options.limit?.value,
            },
          },
        ),
      ),
  });
};
