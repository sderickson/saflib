import type { DbKey } from "@saflib/drizzle";
import type { ErrorCollector, ErrorLevels } from "@saflib/node";
import { getBuildInfo } from "@saflib/node/git-hashes";
import type { IssueLevel } from "./schema.ts";
import { recordOccurrence } from "./queries/record-occurrence.ts";

const LEVELS: Partial<Record<ErrorLevels, IssueLevel>> = {
  warning: "warn",
  error: "error",
  fatal: "fatal",
};

/** The running build, for first/last-seen versions. */
export function currentVersion(): string | null {
  const info = getBuildInfo();
  return info?.commits?.root ?? info?.buildRef ?? null;
}

function tag(tags: Record<string, string | undefined>, key: string): string | null {
  const v = tags[key];
  return v && v !== "-" && v !== "unknown" ? v : null;
}

/**
 * A node error collector (`addErrorCollector`) that records `warning`,
 * `error` and `fatal` reports as issues. Runs alongside any vendor
 * collector (e.g. Sentry). Never throws into the reporter.
 */
export function createIssueCollector(options: {
  getDbKey: () => DbKey;
  /** Skip reports the product records elsewhere (e.g. CSP ingest echoes). */
  ignore?: (message: string) => boolean;
}): ErrorCollector {
  const version = currentVersion();
  return (param) => {
    const level = LEVELS[param.level];
    if (!level) return;
    if (options.ignore?.(param.error.message)) return;
    try {
      recordOccurrence(options.getDbKey(), {
        level,
        kind: "server",
        message: param.error.message,
        stack: param.error.stack,
        errorName: param.error.name,
        fingerprint: param.fingerprint,
        serviceName: tag(param.tags, "service.name"),
        operationName: tag(param.tags, "operation.name"),
        requestId: tag(param.tags, "request.id"),
        fields: Object.keys(param.extra).length > 0 ? param.extra : undefined,
        version,
      });
    } catch (e) {
      console.error("errors-db: could not record issue", e);
    }
  };
}
