/**
 * Build links to open a repo path in GitHub and/or a local IDE.
 *
 * `githubRepo` is `owner/name`. `localRepoRoot` is an absolute host path to the
 * checkout (for `cursor://` / `vscode://` file URLs). Either may be omitted.
 */
export function sourceOpenUrls(
  repoRelativePath: string,
  options: {
    commitHash?: string;
    line?: number;
    githubRepo?: string;
    localRepoRoot?: string;
    ideScheme?: "cursor" | "vscode";
  } = {},
): { github?: string; ide?: string } {
  const path = repoRelativePath.replace(/^\/+/, "");
  const out: { github?: string; ide?: string } = {};

  if (options.githubRepo) {
    const ref = options.commitHash || "main";
    const line = options.line ? `#L${options.line}` : "";
    out.github = `https://github.com/${options.githubRepo}/blob/${ref}/${path}${line}`;
  }

  if (options.localRepoRoot) {
    const root = options.localRepoRoot.replace(/\/+$/, "");
    const scheme = options.ideScheme ?? "cursor";
    const abs = `${root}/${path}`;
    const line = options.line ? `:${options.line}` : "";
    out.ide = `${scheme}://file${abs}${line}`;
  }

  return out;
}

export function openSource(
  repoRelativePath: string,
  options: Parameters<typeof sourceOpenUrls>[1] = {},
): void {
  const urls = sourceOpenUrls(repoRelativePath, options);
  const href = urls.ide || urls.github;
  if (href) {
    window.open(href, "_blank", "noopener,noreferrer");
  }
}
