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
  ExportEntity,
  ExportKind,
} from "./schemas/exports.ts";
export type {
  TestCaseEntity,
} from "./schemas/test-cases.ts";

export type InsertAnalyzedCommitParams = Omit<
  import("./schemas/analyzed-commits.ts").AnalyzedCommitEntity,
  never
>;

export type InsertPackageMetricsParams = Omit<
  import("./schemas/package-metrics.ts").PackageMetricsEntity,
  "id"
>;

export type InsertExportParams = Omit<
  import("./schemas/exports.ts").ExportEntity,
  "id"
>;

export type InsertTestCaseParams = Omit<
  import("./schemas/test-cases.ts").TestCaseEntity,
  "id"
>;
