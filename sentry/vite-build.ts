import { sentryVitePlugin } from "@sentry/vite-plugin";
import { getGitHashes } from "@saflib/node/git-hashes";
import path from "node:path";
import type { PluginOption } from "vite";

export interface SentryViteBuildPluginOptions {
  /** Organization auth token for source map upload (build-time only). */
  authToken: string;
  /** Sentry org slug. */
  org: string;
  /** Sentry project slug for this frontend bundle. */
  project: string;
  /**
   * GitHub `owner/repo` as linked in Sentry (Integrations → GitHub), used for `release.setCommits`.
   */
  githubRepoSlug: string;
  /** Absolute monorepo root; source maps are rewritten to paths relative to this directory. */
  monorepoRoot: string;
}

/**
 * `sources` path rewrite for Sentry uploads: Rollup emits paths relative to each chunk under
 * `dist/assets`; normalize to repo-relative paths for readable stack traces.
 */
export function rewriteSentrySourcesToMonorepoRelative(
  monorepoRoot: string,
  source: string,
  _map: unknown,
  context?: { mapDir: string },
): string {
  if (
    source.startsWith("virtual:") ||
    source.includes("\0") ||
    source.startsWith("webpack:")
  ) {
    return source;
  }

  let absolute: string;
  if (path.isAbsolute(source)) {
    absolute = path.normalize(source);
  } else if (context?.mapDir) {
    absolute = path.normalize(path.resolve(context.mapDir, source));
  } else {
    absolute = path.normalize(path.resolve(monorepoRoot, source));
  }

  const root = path.normalize(monorepoRoot);
  const posix = (p: string) => p.split(path.sep).join("/");
  if (absolute === root || absolute.startsWith(`${root}${path.sep}`)) {
    return posix(path.relative(root, absolute));
  }
  return posix(absolute);
}

/**
 * Vite plugin configuration for production builds: release from `saf-git-hashes`, optional
 * `setCommits` when the tree is clean, and monorepo-relative source map paths.
 *
 * Spread into `plugins`: `...createSentryViteBuildPlugin({ ... })`.
 */
export function createSentryViteBuildPlugin(
  options: SentryViteBuildPluginOptions,
): PluginOption[] {
  const gitRoot = getGitHashes().root;
  const isDirtyBuild = gitRoot.endsWith("-dirty");
  const { monorepoRoot } = options;

  return sentryVitePlugin({
    authToken: options.authToken,
    org: options.org,
    project: options.project,
    sourcemaps: {
      rewriteSources: (source, map, context) =>
        rewriteSentrySourcesToMonorepoRelative(
          monorepoRoot,
          source,
          map,
          context,
        ),
    },
    release: {
      name: gitRoot,
      setCommits: isDirtyBuild
        ? false
        : { repo: options.githubRepoSlug, commit: gitRoot },
    },
  });
}
