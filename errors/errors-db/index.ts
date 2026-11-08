export * from "./errors.ts";
export { issueLevels, issueStatuses } from "./schema.ts";
export type { IssueGroup, IssueKind, IssueLevel, IssueOccurrence, IssueStatus } from "./schema.ts";
export { computeFingerprint, inAppFrames, errorNameFromStack } from "./fingerprint.ts";
export {
  recordOccurrence,
  OCCURRENCES_PER_ISSUE,
  type RecordOccurrenceInput,
  type RecordOccurrenceResult,
} from "./queries/record-occurrence.ts";
export {
  listIssues,
  getIssue,
  listOccurrences,
  type IssueWithWindow,
  type ListIssuesParams,
  type ListIssuesResult,
  type GetIssueResult,
  type ListOccurrencesResult,
} from "./queries/read.ts";
export { setIssueStatus, type SetIssueStatusParams, type SetIssueStatusResult } from "./queries/set-status.ts";
export { pruneIssues, startIssueRetention } from "./retention.ts";
export { createIssueCollector, currentVersion } from "./collector.ts";
export { createRedactionIssueRecorder, type RedactionEventLike } from "./redaction-issues.ts";

import { issuesDbManager } from "./instances.ts";

/** For managing connections to the issues database. */
export const issuesDb = issuesDbManager.publicInterface();
