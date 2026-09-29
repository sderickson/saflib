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

const data = gitHashesFromModules(modules);

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
