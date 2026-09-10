export type {
  ErrorService,
  ListReportedErrorsOptions,
  ReportedErrorInput,
  ReportedErrorKind,
  ReportedErrorRecord,
} from "./types.ts";
export {
  getErrorService,
  hasErrorService,
  resetErrorServiceForTests,
  setErrorService,
} from "./configureErrors.ts";
export {
  createErrorService,
  type CreateErrorServiceOptions,
} from "./createErrorService.ts";
export { configureMockErrors } from "./configureMockErrors.ts";
export { InMemoryErrorService, CSP_INGEST_MESSAGE } from "./in-memory/InMemoryErrorService.ts";
export {
  listReportedErrors,
  recordReportedError,
  resetReportedErrorBufferForTests,
  setReportedErrorBufferCapacityForTests,
} from "./in-memory/reportedErrorBuffer.ts";
