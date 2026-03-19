export interface GitHashes {
  root: string;
  saflib: string;
}

const modules = import.meta.glob<GitHashes>("./git-hashes.json", {
  eager: true,
  import: "default",
});

const data = modules["./git-hashes.json"];

/**
 * Returns git hashes baked in at build time by `saf-git-hashes`.
 * Falls back to `"unknown"` when the generated JSON file is absent.
 */
export function getGitHashes(): GitHashes {
  if (!data) return { root: "unknown", saflib: "unknown" };
  return {
    root: data.root ?? "unknown",
    saflib: data.saflib ?? "unknown",
  };
}
