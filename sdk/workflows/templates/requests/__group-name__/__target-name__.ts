// BEGIN WORKFLOW AREA query-imports FOR sdk/add-query
import { queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";
// END WORKFLOW AREA
// BEGIN WORKFLOW AREA mutation-imports FOR sdk/add-mutation
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";
import type { __ServiceName__ServiceRequestBody } from "template-package-spec";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA query-implementation FOR sdk/add-query

interface __TargetName____GroupName__QueryOptions {
  // TODO: Define the interface for the query. Use vue Ref types, e.g.
  // offset: Ref<number>;
  // limit: Ref<number>;
}

export const __targetName____GroupName__Query = (
  // @ts-expect-error
  options: __TargetName____GroupName__QueryOptions,
) => {
  return queryOptions({
    // TODO: as appropriate, define query key based on the options
    queryKey: ["__group-name__", "__target-name__"],
    queryFn: async () =>
      handleClientMethod(
        // @ts-expect-error
        getClient().GET("/__group-name__/__target-name__", {
          // use options passed in
          params: {
            // limit: options.limit?.value,
          },
        }),
      ),
  });
};
// END WORKFLOW AREA
// BEGIN WORKFLOW AREA mutation-implementation FOR sdk/add-mutation

export const use__TargetName____GroupName__Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      // @ts-expect-error TODO: update argument type. For path-param-only endpoints, use a simple type like `string` for the id.
      data: __ServiceName__ServiceRequestBody["__targetName____GroupName__"],
    ) => {
      return handleClientMethod(
        // @ts-expect-error TODO: update to correct HTTP method and path
        getClient().POST("/__group-name__/__target-name__", { body: data }),
      );
    },
    onSuccess: () => {
      // TODO: Update to invalidate the correct query key
      queryClient.invalidateQueries({ queryKey: ["__group-name__"] });
    },
  });
};
// END WORKFLOW AREA
