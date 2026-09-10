export type ReportedErrorKind = "csp-violation" | "client" | "server" | "test";

export interface ReportedErrorInput {
  kind: ReportedErrorKind;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  source: string;
}

export interface ReportedErrorRecord {
  id: number;
  kind: ReportedErrorKind;
  message: string;
  stack?: string;
  metadata: Record<string, unknown>;
  source: string;
  timestamp: string;
}

export interface ListReportedErrorsOptions {
  kind?: ReportedErrorKind;
  source?: string;
  limit?: number;
}

export interface ErrorService {
  readonly isMocked: boolean;
  recordReportedError(input: ReportedErrorInput): ReportedErrorRecord;
  listReportedErrors(options?: ListReportedErrorsOptions): ReportedErrorRecord[];
  /** Wire server-side error collection. Called once at process boot. */
  installServerCollector(): void;
}
