import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import createClient from "openapi-fetch";
import type {
  paths,
  DevSiteResponseBody,
  DevSiteRequestBody,
} from "@saflib/dev-site-spec";
import { TanstackError, handleClientMethod, createSafClient } from "@saflib/sdk";
import { pickScopeDocFile, summarizeScopeDoc } from "../scope-docs.ts";

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
  package_name: MaybeRefOrGetter<string>,
  options: { allowMissing?: MaybeRefOrGetter<boolean> } = {},
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<
    DevSiteResponseBody["getCommitPackage"][200] | null,
    TanstackError
  >({
    queryKey: ["dev-site", "commit-package", hash, package_name],
    enabled: () => Boolean(toValue(hash) && toValue(package_name)),
    queryFn: async () => {
      try {
        return await handleClientMethod(
          client.GET("/api/commits/{hash}/packages/{package_name}", {
            params: {
              path: {
                hash: toValue(hash),
                package_name: toValue(package_name),
              },
            },
          }),
        );
      } catch (err) {
        if (
          toValue(options.allowMissing) &&
          err instanceof TanstackError &&
          err.status === 404
        ) {
          return null;
        }
        throw err;
      }
    },
  });
}

export function useCommitDiff(
  subdomain: string,
  from_hash: MaybeRefOrGetter<string>,
  to_hash: MaybeRefOrGetter<string>,
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["diffCommits"][200], TanstackError>({
    queryKey: ["dev-site", "diff", from_hash, to_hash],
    enabled: () => Boolean(toValue(from_hash) && toValue(to_hash)),
    queryFn: () => {
      return handleClientMethod(
        client.GET("/api/commits/{hash}/diff/{other_hash}", {
          params: {
            path: {
              hash: toValue(from_hash),
              other_hash: toValue(to_hash),
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
      queryClient.invalidateQueries({ queryKey: ["dev-site", "diff"] });
    },
  });
}

export function useCheckout(
  subdomain: string,
  compare_ref: MaybeRefOrGetter<string | undefined> = undefined,
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["getCheckout"][200], TanstackError>({
    queryKey: ["dev-site", "checkout", compare_ref],
    queryFn: () => {
      const ref = toValue(compare_ref);
      return handleClientMethod(
        client.GET("/api/checkout", {
          params: {
            query: ref ? { compare_ref: ref } : {},
          },
        }),
      );
    },
  });
}

export function useRepoFiles(
  subdomain: string,
  params: MaybeRefOrGetter<{
    ref: string;
    prefix?: string;
    ext?: string | string[];
    content?: boolean;
  }>,
) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["listRepoFiles"][200], TanstackError>({
    queryKey: ["dev-site", "repo-files", params],
    enabled: () => {
      const p = toValue(params);
      if (!p.ref) return false;
      if (p.content) return Boolean(p.prefix);
      return true;
    },
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
              content: p.content || undefined,
            },
          },
        }),
      );
    },
  });
}

/**
 * One prefix list (with contents) → README / leading JSDoc for the Spec header.
 */
export function useScopeSummary(
  subdomain: string,
  params: MaybeRefOrGetter<{ ref: string; prefix: string }>,
) {
  const filesQuery = useRepoFiles(subdomain, () => {
    const p = toValue(params);
    return { ref: p.ref, prefix: p.prefix, content: true };
  });
  const summary = computed(() => {
    const prefix = toValue(params).prefix;
    const files = filesQuery.data.value?.files ?? [];
    return summarizeScopeDoc(pickScopeDocFile(files, prefix));
  });
  return { summary, isLoading: filesQuery.isLoading };
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

