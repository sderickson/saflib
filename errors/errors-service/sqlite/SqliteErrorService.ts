import type { DbKey } from "@saflib/drizzle";
import { addErrorCollector } from "@saflib/node";
import {
  createIssueCollector,
  currentVersion,
  recordOccurrence,
  type IssueLevel,
} from "@saflib/errors-db";
import { issuesDbManager } from "@saflib/errors-db/instances";
import type {
  ErrorService,
  ListReportedErrorsOptions,
  ReportedErrorInput,
  ReportedErrorKind,
  ReportedErrorRecord,
} from "../types.ts";
import { CSP_INGEST_MESSAGE } from "../in-memory/InMemoryErrorService.ts";

const KIND_TO_ISSUE: Record<ReportedErrorKind, { kind: string; level: IssueLevel }> = {
  client: { kind: "client", level: "error" },
  server: { kind: "server", level: "error" },
  "csp-violation": { kind: "csp", level: "warn" },
  test: { kind: "test", level: "error" },
};
const ISSUE_TO_KIND: Record<string, ReportedErrorKind> = {
  client: "client",
  server: "server",
  csp: "csp-violation",
  test: "test",
};

/**
 * Persistent error service backed by `@saflib/errors-db`: server reports
 * (via the node error collector) and client/CSP reports become grouped
 * issues with status, regressions and occurrences. The issue list is served
 * by the ops API; `listReportedErrors` (dev admin page) shows the latest
 * occurrences.
 */
export class SqliteErrorService implements ErrorService {
  readonly isMocked = false;
  private readonly getDbKey: () => DbKey;
  private readonly version = currentVersion();

  constructor(options: { getDbKey: () => DbKey }) {
    this.getDbKey = options.getDbKey;
  }

  recordReportedError(input: ReportedErrorInput): ReportedErrorRecord {
    const { kind, level } = KIND_TO_ISSUE[input.kind];
    const { occurrenceId, group } = recordOccurrence(this.getDbKey(), {
      level,
      kind,
      message: input.message,
      stack: input.stack,
      serviceName: input.source,
      fields: input.metadata,
      version: this.version,
    });
    return {
      id: occurrenceId,
      kind: input.kind,
      message: group.title,
      stack: input.stack,
      metadata: input.metadata ?? {},
      source: input.source,
      timestamp: new Date().toISOString(),
    };
  }

  listReportedErrors(options: ListReportedErrorsOptions = {}): ReportedErrorRecord[] {
    const client = issuesDbManager.get(this.getDbKey())!.$client;
    const issueKind = options.kind ? KIND_TO_ISSUE[options.kind].kind : null;
    const source = options.source ?? null;
    const rows = client
      .prepare(
        `SELECT o.id, o.ts, o.message, o.stack, o.fields, g.kind, g.service_name
         FROM issue_occurrences o JOIN issue_groups g ON g.id = o.group_id
         WHERE (? IS NULL OR g.kind = ?) AND (? IS NULL OR g.service_name = ?)
         ORDER BY o.id DESC LIMIT ?`,
      )
      .all(issueKind, issueKind, source, source, Math.min(options.limit ?? 100, 500)) as Array<{
      id: number;
      ts: number;
      message: string;
      stack: string | null;
      fields: string | null;
      kind: string;
      service_name: string | null;
    }>;
    return rows.map((r) => ({
      id: r.id,
      kind: ISSUE_TO_KIND[r.kind] ?? "server",
      message: r.message,
      ...(r.stack ? { stack: r.stack } : {}),
      metadata: r.fields ? (JSON.parse(r.fields) as Record<string, unknown>) : {},
      source: r.service_name ?? "server",
      timestamp: new Date(r.ts).toISOString(),
    }));
  }

  installServerCollector(): void {
    addErrorCollector(
      createIssueCollector({
        getDbKey: this.getDbKey,
        // CSP reports are recorded directly; the collector would echo them.
        ignore: (m) => m === CSP_INGEST_MESSAGE,
      }),
    );
  }
}
