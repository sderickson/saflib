export {
  listReportedErrors,
  recordReportedError,
  resetReportedErrorBufferForTests,
  setReportedErrorBufferCapacityForTests,
  type ReportedErrorKind,
  type ReportedErrorInput,
  type ReportedErrorRecord,
} from "@saflib/errors-service";

export { configureMockErrors } from "@saflib/errors-service";

export {
  createDevErrorsRouter,
  createErrorsRouter,
} from "./express/createErrorsRouter.ts";
