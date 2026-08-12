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
  BlobFactEntity,
  BlobExportFact,
  BlobTestCaseFact,
} from "./schemas/blob-facts.ts";

export type InsertAnalyzedCommitParams = Omit<
  import("./schemas/analyzed-commits.ts").AnalyzedCommitEntity,
  never
>;

export type InsertPackageMetricsParams = Omit<
  import("./schemas/package-metrics.ts").PackageMetricsEntity,
  "id"
>;

export type InsertBlobFactParams = Omit<
  import("./schemas/blob-facts.ts").BlobFactEntity,
  never
>;
