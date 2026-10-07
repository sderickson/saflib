export interface GitHashes {
  root: string;
  saflib: string;
}

const modules = import.meta.glob<GitHashes>("./git-hashes.json", {
  eager: true,
  import: "default",
});

function gitHashesFromModules(
  entries: Record<string, GitHashes | undefined>,
): GitHashes | undefined {
  const direct = entries["./git-hashes.json"];
  if (direct) return direct;
  const values = Object.values(entries);
  return values.length > 0 ? values[0] : undefined;
}

declare global {
  interface ImportMetaEnv {
    /** Defined by `@saflib/vite` `makeConfig` from the image's build info. */
    readonly SAF_GIT_HASHES?: GitHashes;
  }
}

// Must stay a literal `import.meta.env.SAF_GIT_HASHES` — Vite's `define`
// replaces it textually.
const defined = import.meta.env.SAF_GIT_HASHES;

const data = defined ?? gitHashesFromModules(modules);

/**
 * Returns the commits this client bundle's image was built from, as baked in
 * by `@saflib/vite` `makeConfig` (from `/etc/saf/build.json`, see
 * `saf-docker build`). Falls back to the `git-hashes.json` written by the
 * deprecated `saf-git-hashes`, then to `"unknown"`.
 */
export function getGitHashes(): GitHashes {
  if (!data) return { root: "unknown", saflib: "unknown" };
  return {
    root: data.root ?? "unknown",
    saflib: data.saflib ?? "unknown",
  };
}
