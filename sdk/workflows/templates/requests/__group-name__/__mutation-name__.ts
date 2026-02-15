import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";
import type { __ServiceName__ServiceRequestBody } from "template-package-spec";

// BEGIN ONCE WORKFLOW AREA instructions FOR sdk/add-mutation IF upload
/*
To upload a file with a tanstack mutation, you'll need to modify the logic
below to be something like this:

const formData = new FormData();
// append the File
formData.append("file", file);
// append any other request body fields
formData.append("category", category);
// use "as any" to override tanstack not liking it
const res = await handleClientMethod(
  getClient().POST("/file-upload", {
    body: formData as any, // hack...
  }),
);
 */
// END WORKFLOW AREA

export const use__MutationName____GroupName__Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: __ServiceName__ServiceRequestBody["__mutationName____GroupName__"],
    ) => {
      return handleClientMethod(
        // @ts-expect-error TODO: update to correct HTTP method and path
        getClient().POST("/__group-name__/__mutation-name__", { body: data }),
      );
    },
    onSuccess: () => {
      // TODO: Update to invalidate the correct query key
      queryClient.invalidateQueries({ queryKey: ["__group-name__"] });
    },
  });
};
