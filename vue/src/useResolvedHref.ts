import { ref, onMounted, type Ref } from "vue";
import type { Link, LinkOptions } from "@saflib/links";
import { linkToHrefWithHost } from "@saflib/links";

/**
 * Resolves a multi-subdomain href for use in prerendered (SSG) Vue pages.
 *
 * During the static build, `linkToHrefWithHost` may only know paths; after
 * `onMounted`, it runs again in the browser and produces full URLs. A second
 * assignment after mount also forces the DOM to update when Vuetify or
 * hydration would otherwise leave stale `href` attributes.
 *
 * **VitePress / SSR:** import from `@saflib/vue/useResolvedHref`, not the
 * `@saflib/vue` package root — the main entry pulls in modules that touch
 * `document` at load time and break Node prerender.
 */
export function useResolvedHref(link: Link, options?: LinkOptions): Ref<string>;

export function useResolvedHref(resolve: () => string): Ref<string>;

export function useResolvedHref(
  linkOrResolve: Link | (() => string),
  options?: LinkOptions,
): Ref<string> {
  const resolve = () =>
    typeof linkOrResolve === "function"
      ? linkOrResolve()
      : linkToHrefWithHost(linkOrResolve, options);

  const href = ref("");
  onMounted(() => {
    href.value = resolve();
  });
  return href;
}
