import "./vue-query-register.ts";

// ── Shared result classes ───────────────────────────────────────────────────
export {
  FlowGone,
  BrowserRedirectRequired,
  SecurityCsrfViolation,
  SessionAlreadyAvailable,
  UnhandledResponse,
} from "./flow-results.ts";

export {
  isKratosSecurityCsrfResponseBody,
  resultFromKratosGetFlowHttpError,
} from "./get-flow-query-error.ts";

// ── Helpers (non-query) ─────────────────────────────────────────────────────
export { fetchKratosSession } from "./helpers/fetch-kratos-session.ts";
export {
  assertKratosSessionIdentityLoaded,
  kratosIdentityEmail,
} from "./helpers/kratos-session.ts";
export { identityNeedsEmailVerification } from "./helpers/kratos-identity.ts";

// ── Queries: session ────────────────────────────────────────────────────────
export {
  kratosSessionQueryOptions,
  useKratosSession,
} from "./queries/kratos-session.ts";

// ── Queries: create flow ────────────────────────────────────────────────────
export {
  LoginFlowCreated,
  createLoginFlowQueryOptions,
  useCreateLoginFlowQuery,
} from "./queries/create-login-flow.ts";
export {
  RegistrationFlowCreated,
  createRegistrationFlowQueryOptions,
  useCreateRegistrationFlowQuery,
} from "./queries/create-registration-flow.ts";
export {
  RecoveryFlowCreated,
  createRecoveryFlowQueryOptions,
  useCreateRecoveryFlowQuery,
} from "./queries/create-recovery-flow.ts";
export {
  SettingsFlowCreated,
  createSettingsFlowQueryOptions,
  useCreateSettingsFlowQuery,
} from "./queries/create-settings-flow.ts";
export {
  VerificationFlowCreated,
  createVerificationFlowQueryOptions,
  useCreateVerificationFlowQuery,
} from "./queries/create-verification-flow.ts";
export {
  BrowserLogoutFlowCreated,
  createBrowserLogoutFlowQueryOptions,
  useCreateBrowserLogoutFlowQuery,
} from "./queries/create-browser-logout-flow.ts";

// ── Queries: get flow by id ─────────────────────────────────────────────────
export {
  LoginFlowFetched,
  getLoginFlowQueryOptions,
  useGetLoginFlowQuery,
} from "./queries/get-login-flow.ts";
export {
  RegistrationFlowFetched,
  getRegistrationFlowQueryOptions,
  useGetRegistrationFlowQuery,
} from "./queries/get-registration-flow.ts";
export {
  RecoveryFlowFetched,
  getRecoveryFlowQueryOptions,
  useGetRecoveryFlowQuery,
} from "./queries/get-recovery-flow.ts";
export {
  SettingsFlowFetched,
  getSettingsFlowQueryOptions,
  useGetSettingsFlowQuery,
} from "./queries/get-settings-flow.ts";
export {
  VerificationFlowFetched,
  getVerificationFlowQueryOptions,
  useGetVerificationFlowQuery,
} from "./queries/get-verification-flow.ts";

// ── Mutations ───────────────────────────────────────────────────────────────
export {
  LoginCompleted,
  LoginFlowUpdated,
  useUpdateLoginFlowMutation,
} from "./mutations/update-login-flow.ts";
export {
  RegistrationCompleted,
  RegistrationFlowUpdated,
  useUpdateRegistrationFlowMutation,
} from "./mutations/update-registration-flow.ts";
export {
  RecoveryFlowUpdated,
  useUpdateRecoveryFlowMutation,
} from "./mutations/update-recovery-flow.ts";
export {
  SettingsFlowUpdated,
  useUpdateSettingsFlowMutation,
} from "./mutations/update-settings-flow.ts";
export {
  VerificationFlowUpdated,
  useUpdateVerificationFlowMutation,
} from "./mutations/update-verification-flow.ts";
