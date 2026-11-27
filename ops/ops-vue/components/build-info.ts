import { getDeploymentName, getGitHashes } from "@saflib/vue";
import { build_chip as strings } from "./BuildChip.strings.ts";

/** Where each repo's commits live, e.g. `https://github.com/acme/app`. */
export interface BuildRepoUrls {
  root?: string;
  saflib?: string;
}

export const DEFAULT_SAFLIB_REPO_URL = "https://github.com/sderickson/saflib";

export interface BuildCommit {
  label: string;
  sha: string;
  shortSha: string;
  /** Link to the commit, when the repo URL is known and the sha is real. */
  href?: string;
}

const isSha = (s: string) => /^[0-9a-f]{7,40}$/i.test(s);

export const commitHref = (repoUrl: string | undefined, sha: string) =>
  repoUrl && isSha(sha) ? `${repoUrl.replace(/\/+$/, "")}/commit/${sha}` : undefined;

const cleanSha = (s: string | null | undefined) => (s ?? "").replace(/-dirty$/, "");

/** What changed between two commits, e.g. between consecutive deploys. */
export const compareHref = (repoUrl: string | undefined, from: string | null | undefined, to: string | null | undefined) => {
  const a = cleanSha(from);
  const b = cleanSha(to);
  return repoUrl && isSha(a) && isSha(b) && a !== b ? `${repoUrl.replace(/\/+$/, "")}/compare/${a}...${b}` : undefined;
};

/** The commits this bundle was built from, with links where possible. */
export function getBuildCommits(repos: BuildRepoUrls = {}): {
  root: BuildCommit;
  saflib: BuildCommit;
} {
  const hashes = getGitHashes();
  const mk = (label: string, sha: string, repoUrl?: string): BuildCommit => ({
    label,
    sha,
    shortSha: isSha(sha) ? sha.slice(0, 7) : sha,
    href: commitHref(repoUrl, sha),
  });
  return {
    root: mk(strings.rootLabel, hashes.root, repos.root),
    saflib: mk(strings.saflibLabel, hashes.saflib, repos.saflib ?? DEFAULT_SAFLIB_REPO_URL),
  };
}

/** "dev", "prod", or the raw deployment name. */
export function getDeploymentLabel(): string {
  const name = getDeploymentName();
  if (!name) return strings.unknownDeployment;
  return strings.deploymentShort[name] ?? name;
}
