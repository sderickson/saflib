import { execFileSync } from "node:child_process";
import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";

export interface ExecGitOptions {
  /** Data written to the git process stdin (e.g. for `cat-file --batch`). */
  input?: string | Buffer;
}

function toGitCommandError(
  cause: unknown,
  args: readonly string[],
): GitCommandError {
  const err = cause as {
    status?: number | null;
    stderr?: string | Buffer;
    message?: string;
  };
  const stderr =
    typeof err.stderr === "string"
      ? err.stderr
      : Buffer.isBuffer(err.stderr)
        ? err.stderr.toString("utf8")
        : "";
  return new GitCommandError(
    stderr.trim() || err.message || `git ${args.join(" ")} failed`,
    {
      args,
      stderr,
      exitCode: err.status ?? null,
      cause,
    },
  );
}

/**
 * Thin `git` runner for this package.
 *
 * Deliberately does **not** reuse `@saflib/docker`'s `execGit`: that helper is
 * CLI/dev-tooling flavored (`execSync` with a joined shell string, swallows
 * stderr, returns exit codes without typed errors). `@saflib/git` needs to be a
 * dependency-light library other packages can import at runtime, so it owns its
 * own `execFileSync` wrapper (no shell quoting of hashes/paths) and surfaces
 * failures as {@link GitCommandError}.
 */
export function execGit(
  repoRoot: string,
  args: readonly string[],
  options: ExecGitOptions = {},
): ReturnsError<string, GitCommandError> {
  try {
    const stdout = execFileSync("git", [...args], {
      cwd: repoRoot,
      encoding: "utf8",
      input: options.input,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { result: stdout };
  } catch (cause) {
    return { error: toGitCommandError(cause, args) };
  }
}

/**
 * Same as {@link execGit} but returns raw stdout bytes.
 * Required for `cat-file --batch`, where sizes are byte counts.
 */
export function execGitBuffer(
  repoRoot: string,
  args: readonly string[],
  options: ExecGitOptions = {},
): ReturnsError<Buffer, GitCommandError> {
  try {
    const stdout = execFileSync("git", [...args], {
      cwd: repoRoot,
      // Omit encoding → Buffer (byte-accurate for --batch framing).
      input: options.input,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { result: stdout as Buffer };
  } catch (cause) {
    return { error: toGitCommandError(cause, args) };
  }
}
