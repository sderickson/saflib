import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { createSafClient, handleClientMethod } from "@saflib/sdk";
import type { Paths } from "@saflib/secrets-spec";

const client = createSafClient<Paths>("secrets");

// Example Query: List secrets
export const useListSecrets = () => {
  return useQuery({
    queryKey: ["secrets", "list"],
    queryFn: async () => {
      const result = await client.GET("/secrets");
      return handleClientMethod(result);
    },
  });
};

// Example Mutation: Create secret
export const useCreateSecret = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Paths["/secrets"]["post"]["requestBody"]["content"]["application/json"],
    ) => {
      const result = await client.POST("/secrets", {
        body: data,
      });
      return handleClientMethod(result);
    },
    onSuccess: () => {
      // Invalidate and refetch secrets list
      queryClient.invalidateQueries({ queryKey: ["secrets", "list"] });
    },
  });
};

// TODO: Replace with your actual API query/mutation
// Follow the pattern above:
// 1. Use useQuery for GET operations (queries)
// 2. Use useMutation for POST/PUT/DELETE operations (mutations)
// 3. Use createSafClient with your service subdomain
// 4. Use handleClientMethod to handle responses
// 5. Use queryClient.invalidateQueries to refresh related data after mutations
