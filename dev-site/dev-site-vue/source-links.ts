import { sha256Hex } from "./sha256-hex.ts";

/**
 * Build links to open a repo path in GitHub and/or a local IDE.
 *
 * `github_repo` is `owner/name`. `localRepoRoot` is an absolute host path to the
 * checkout (for `cursor://` / `vscode://` file URLs). Either may be omitted.
 *
 * GitHub blob links prefer a branch/tag (`githubRef`). When omitted, fall back to
 * `commit_hash` (detached HEAD), then `main`.
 */
export function resolveGithubSourceRef(options: {
  branch?: string | null;
  commit_hash?: string | null;
  fallbackRef?: string;
}): string {
  if (options.branch) {
    return options.branch;
  }
  if (options.commit_hash) {
    return options.commit_hash;
  }
  return options.fallbackRef ?? "main";
}

export function sourceOpenUrls(
  repoRelativePath: string,
  options: {
    /** Branch, tag, or commit SHA for GitHub blob URLs. */
    githubRef?: string;
    /** Used when {@link githubRef} is omitted (e.g. detached HEAD). */
    commit_hash?: string;
    line?: number;
    github_repo?: string;
    localRepoRoot?: string;
    ideScheme?: "cursor" | "vscode";
  } = {},
): { github?: string; ide?: string } {
  const path = repoRelativePath.replace(/^\/+/, "");
  const out: { github?: string; ide?: string } = {};

  if (options.github_repo) {
    const ref =
      options.githubRef ||
      options.commit_hash ||
      "main";
    const line = options.line ? `#L${options.line}` : "";
    out.github = `https://github.com/${options.github_repo}/blob/${ref}/${path}${line}`;
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

/** GitHub compare URL for changes between two refs (branch names or SHAs). */
export function githubCompareUrl(
  github_repo: string,
  baseRef: string,
  headRef: string,
): string {
  return `https://github.com/${github_repo}/compare/${baseRef}...${headRef}`;
}

/** Anchor for a file row on GitHub compare / PR files (SHA-256 of repo path). */
export async function githubCompareFileDiffAnchor(
  repoRelativePath: string,
): Promise<string> {
  const path = repoRelativePath.replace(/^\/+/, "");
  return `diff-${await sha256Hex(path)}`;
}

/** Jump to one file's diff on the GitHub compare page. */
export async function githubCompareFileUrl(
  github_repo: string,
  baseRef: string,
  headRef: string,
  repoRelativePath: string,
): Promise<string> {
  const anchor = await githubCompareFileDiffAnchor(repoRelativePath);
  return `${githubCompareUrl(github_repo, baseRef, headRef)}#${anchor}`;
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
