// @ts-nocheck // TODO: remove this
import { useMutation, useQueryClient, queryOptions } from "@tanstack/vue-query";
import { client } from "./client.ts";
import type {
  ApiRequest,
  ApiResponseBody,
  ApiRequestPathParams,
} from "@your-org/specs-apis";
import { handleClientMethod } from "../../src/tanstack.ts";
import type { Ref } from "vue";

// --- PLACEHOLDER TYPES ---
// Replace FEATURE, ENDPOINT, etc. with your feature-specific names

export type GetFeatureResponse = ApiResponseBody["getFeature"][200];
export function getFeature() {
  return queryOptions({
    queryKey: ["feature"],
    queryFn: async () => handleClientMethod(client.GET("/feature", {})),
  });
}

export type CreateFeatureBody = ApiRequest["createFeature"];
export type CreateFeatureResponse = ApiResponseBody["createFeature"][201];
export function useCreateFeature() {
  const queryClient = useQueryClient();

  const mutationFn = (body: CreateFeatureBody) => {
    return handleClientMethod(client.POST("/feature", { body }));
  };

  return useMutation({
    mutationFn,
    onSuccess: (_data, _variables, _context) => {
      queryClient.invalidateQueries({ queryKey: ["feature"] });
    },
  });
}

export type UpdateFeatureBody = ApiRequest["updateFeature"];
export type UpdateFeatureResponse = ApiResponseBody["updateFeature"][200];
export function useUpdateFeature() {
  const queryClient = useQueryClient();

  const mutationFn = ({
    id,
    feature,
  }: {
    id: number;
    feature: UpdateFeatureBody;
  }) => {
    return handleClientMethod(
      client.PUT("/feature/{id}", {
        params: { path: { id } },
        body: feature,
      }),
    );
  };

  return useMutation({
    mutationFn,
    onSuccess: (_data, variables, _context) => {
      queryClient.invalidateQueries({ queryKey: ["feature"] });
      queryClient.invalidateQueries({ queryKey: ["feature", variables.id] });
    },
  });
}

// Add more queries/mutations as needed for your feature.
