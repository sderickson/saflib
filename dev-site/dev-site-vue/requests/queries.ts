import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import createClient from "openapi-fetch";
import type {
  paths,
  DevSiteResponseBody,
  DevSiteRequestBody,
} from "@saflib/dev-site-spec";
import { TanstackError, handleClientMethod, createSafClient } from "@saflib/sdk";

/**
 * Create an openapi-fetch client for the dev-site API.
 *
 * - Pass a short subdomain (e.g. `"test"`) for the usual SAF `subdomain.host` client
 *   (component tests / MSW).
 * - Pass `""` for same-origin requests (SPA behind Vite proxy or Express static).
 */
export function createDevSiteClient(subdomain: string) {
  if (subdomain === "") {
    return createClient<paths>({
      baseUrl: "",
      credentials: "include",
      fetch: (request) => {
        const csrfToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("_csrf_token="))
          ?.split("=")[1];
        if (csrfToken) {
          request.headers.set("X-CSRF-Token", csrfToken);
        }
        const method = request.method.toUpperCase();
        if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
          request.headers.set("X-Requested-With", "XMLHttpRequest");
        }
        return fetch(request);
      },
    });
  }
  return createSafClient<paths>(subdomain);
}

export function useCommits(
  subdomain: string,
  params: MaybeRefOrGetter<{ cursor?: string; limit?: number }> = {},
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["listCommits"][200], TanstackError>({
    queryKey: ["dev-site", "commits", params],
    queryFn: () => {
      const p = toValue(params);
      return handleClientMethod(
        client.GET("/api/commits", {
          params: {
            query: {
              cursor: p.cursor,
              limit: p.limit,
            },
          },
        }),
      );
    },
  });
}

export function useCommit(
  subdomain: string,
  hash: MaybeRefOrGetter<string>,
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["getCommits"][200], TanstackError>({
    queryKey: ["dev-site", "commit", hash],
    enabled: () => Boolean(toValue(hash)),
    queryFn: () => {
      return handleClientMethod(
        client.GET("/api/commits/{hash}", {
          params: { path: { hash: toValue(hash) } },
        }),
      );
    },
  });
}

export function useCommitPackage(
  subdomain: string,
  hash: MaybeRefOrGetter<string>,
  packageName: MaybeRefOrGetter<string>,
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["getCommitPackage"][200], TanstackError>({
    queryKey: ["dev-site", "commit-package", hash, packageName],
    enabled: () => Boolean(toValue(hash) && toValue(packageName)),
    queryFn: () => {
      return handleClientMethod(
        client.GET("/api/commits/{hash}/packages/{packageName}", {
          params: {
            path: {
              hash: toValue(hash),
              packageName: toValue(packageName),
            },
          },
        }),
      );
    },
  });
}

export function useCommitDiff(
  subdomain: string,
  fromHash: MaybeRefOrGetter<string>,
  toHash: MaybeRefOrGetter<string>,
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["diffCommits"][200], TanstackError>({
    queryKey: ["dev-site", "diff", fromHash, toHash],
    enabled: () => Boolean(toValue(fromHash) && toValue(toHash)),
    queryFn: () => {
      return handleClientMethod(
        client.GET("/api/commits/{hash}/diff/{otherHash}", {
          params: {
            path: {
              hash: toValue(fromHash),
              otherHash: toValue(toHash),
            },
          },
        }),
      );
    },
  });
}

export function useScanMutation(subdomain: string) {
  const client = createDevSiteClient(subdomain);
  const queryClient = useQueryClient();
  return useMutation<
    DevSiteResponseBody["executeScan"][200],
    TanstackError,
    DevSiteRequestBody["executeScan"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/api/scan", { body: body ?? {} }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dev-site", "commits"] });
      queryClient.invalidateQueries({ queryKey: ["dev-site", "checkout"] });
      queryClient.invalidateQueries({ queryKey: ["dev-site", "commit"] });
      queryClient.invalidateQueries({ queryKey: ["dev-site", "commit-package"] });
    },
  });
}

export function useCheckout(subdomain: string) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["getCheckout"][200], TanstackError>({
    queryKey: ["dev-site", "checkout"],
    queryFn: () => handleClientMethod(client.GET("/api/checkout")),
  });
}

export function useRepoFiles(
  subdomain: string,
  params: MaybeRefOrGetter<{
    ref: string;
    prefix?: string;
    ext?: string | string[];
  }>,
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["listRepoFiles"][200], TanstackError>({
    queryKey: ["dev-site", "repo-files", params],
    enabled: () => Boolean(toValue(params).ref),
    queryFn: () => {
      const p = toValue(params);
      const ext = p.ext
        ? Array.isArray(p.ext)
          ? p.ext
          : [p.ext]
        : undefined;
      return handleClientMethod(
        client.GET("/api/repo/files", {
          params: {
            query: {
              ref: p.ref,
              prefix: p.prefix,
              ext,
            },
          },
        }),
      );
    },
  });
}

export function useRepoFile(
  subdomain: string,
  params: MaybeRefOrGetter<{ ref: string; path: string }>,
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["getRepoFile"][200], TanstackError>({
    queryKey: ["dev-site", "repo-file", params],
    enabled: () => {
      const p = toValue(params);
      return Boolean(p.ref && p.path);
    },
    queryFn: () => {
      const p = toValue(params);
      return handleClientMethod(
        client.GET("/api/repo/file", {
          params: {
            query: {
              ref: p.ref,
              path: p.path,
            },
          },
        }),
      );
    },
  });
}
