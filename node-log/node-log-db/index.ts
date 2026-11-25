export { logEntries, logTemplates, logLevels, logContextKinds } from "./schema.ts";
export type { LogEntry, LogLevel, LogTemplate, LogContextKind } from "./schema.ts";
export { normalizeTemplate, templateHash } from "./templates.ts";
export {
  PersistentLogTransport,
  createPersistentLogTransport,
  type PersistentLogTransportOptions,
  type RedactionEvent,
} from "./transport.ts";
export { pruneLogs, usedBytes, type PruneResult, type RetentionOptions } from "./retention.ts";
export { listLogs, toFtsQuery, type ListLogsParams, type ListLogsResult } from "./queries/list-logs.ts";
export {
  listLogGroups,
  type ListLogGroupsParams,
  type ListLogGroupsResult,
  type LogGroup,
  type LogGroupRequestLine,
} from "./queries/list-log-groups.ts";
export { countLogsByLevel, type CountLogsByLevelResult } from "./queries/count-by-level.ts";
export { countActiveUsers, type CountActiveUsersResult } from "./queries/count-active-users.ts";
export {
  listTemplates,
  type ListTemplatesParams,
  type ListTemplatesResult,
  type TemplateWithWindowCount,
} from "./queries/list-templates.ts";

import { logsDbManager } from "./instances.ts";

/** For managing connections to the logs database. */
export const logsDb = logsDbManager.publicInterface();
