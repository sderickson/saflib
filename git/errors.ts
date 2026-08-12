/**
 * Raised when a git plumbing command exits non-zero or produces unparseable output.
 * Consumers should treat this as an expected, typed failure (missing ref, corrupt
 * object, not a git repo, etc.) rather than an unexpected exception.
 */
export class GitCommandError extends Error {
  readonly args: readonly string[];
  readonly stderr: string;
  readonly exitCode: number | null;

  constructor(
    message: string,
    options: {
      args: readonly string[];
      stderr?: string;
      exitCode?: number | null;
      cause?: unknown;
    },
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "GitCommandError";
    this.args = options.args;
    this.stderr = options.stderr ?? "";
    this.exitCode = options.exitCode ?? null;
  }
}
