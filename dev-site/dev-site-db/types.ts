export type {
  AnalyzedCommitEntity,
  AnalyzedCommitRef,
  AnalyzedCommitRefType,
  AnalyzedCommitStatus,
} from "./schemas/analyzed-commits.ts";
export type {
  PackageMetricsEntity,
} from "./schemas/package-metrics.ts";
export type {
  ExportDefEntity,
  ExportKind,
} from "./schemas/exports.ts";
export type {
  CommitExportEntity,
} from "./schemas/commit-exports.ts";
export type {
  TestCaseDefEntity,
} from "./schemas/test-cases.ts";
export type {
  CommitTestCaseEntity,
} from "./schemas/commit-test-cases.ts";

export type InsertAnalyzedCommitParams = Omit<
  import("./schemas/analyzed-commits.ts").AnalyzedCommitEntity,
  never
>;

export type InsertPackageMetricsParams = Omit<
  import("./schemas/package-metrics.ts").PackageMetricsEntity,
  "id"
>;

/** Fields needed to upsert an export def and link it to a commit. */
export type InsertExportParams = {
  commitHash: string;
  packageName: string;
  filePath: string;
  name: string;
  kind: import("./schemas/exports.ts").ExportKind;
};

/** Fields needed to upsert a test-case def and link it to a commit. */
export type InsertTestCaseParams = {
  commitHash: string;
  packageName: string;
  filePath: string;
  fullName: string;
};
