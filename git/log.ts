import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";
import type { GitCommit, LogOptions } from "./types.ts";

const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x1e";

/**
 * Walk commits on `ref` (default `HEAD`), newest first — same order as
 * `git log`. Uses `--first-parent` so merge commits don't fan the walk out.
 *
 * Field format is controlled here so callers never parse raw git pretty-format
 * strings themselves.
 */
export function log(
  repoRoot: string,
  options: LogOptions = {},
): ReturnsError<GitCommit[], GitCommandError> {
  const ref = options.ref ?? "HEAD";
  const range = options.since ? `${options.since}..${ref}` : ref;

  const args = [
    "log",
    "--first-parent",
    `--pretty=format:%H${FIELD_SEP}%P${FIELD_SEP}%aI${FIELD_SEP}%s${RECORD_SEP}`,
  ];
  if (options.limit !== undefined) {
    args.push(`-n${options.limit}`);
  }
  args.push(range);

  const { result: stdout, error } = execGit(repoRoot, args);
  if (error) {
    return { error };
  }

  const commits: GitCommit[] = [];
  const records = stdout.split(RECORD_SEP);
  for (const record of records) {
    const trimmed = record.replace(/^\n+/, "").trimEnd();
    if (!trimmed) continue;
    const [hash, parents, authoredAt, subject] = trimmed.split(FIELD_SEP);
    if (!hash || !authoredAt || subject === undefined) {
      return {
        error: new GitCommandError(
          `Unparseable git log record: ${JSON.stringify(trimmed)}`,
          { args, stderr: "" },
        ),
      };
    }
    commits.push({
      hash,
      parentHashes: parents ? parents.split(" ").filter(Boolean) : [],
      authoredAt,
      subject,
    });
  }
  return { result: commits };
}
