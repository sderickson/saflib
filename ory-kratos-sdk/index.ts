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

// ── Client & session ────────────────────────────────────────────────────────
export {
  assertKratosSessionIdentityLoaded,
  fetchKratosSession,
  kratosIdentityEmail,
  kratosSessionQueryOptions,
  kratosSessionRequiredQueryKey,
  kratosSessionRequiredQueryOptions,
  useKratosSession,
} from "./kratos-session.ts";
export { identityNeedsEmailVerification } from "./kratos-identity.ts";

// ── HTTP helpers (still useful for ad-hoc checks outside query/mutation) ─────
export {
  isKratosAalNotSatisfiedError,
  isKratosFlowGoneError,
  kratosAalNotSatisfiedRedirectTo,
} from "./kratos-http-error.ts";
export { kratosFlowQueryRetry } from "./kratos-query-retry.ts";

// ── Raw fetch helpers (for non-query usage, e.g. post-registration login) ────
export {
  fetchBrowserLoginFlow,
  fetchBrowserLogoutFlow,
  fetchBrowserRecoveryFlow,
  fetchBrowserRegistrationFlow,
  fetchBrowserSettingsFlow,
  fetchBrowserVerificationFlow,
  fetchLoginFlowById,
  fetchRecoveryFlowById,
  fetchRegistrationFlowById,
  fetchSettingsFlowById,
  fetchVerificationFlowById,
  getRecoveryFlow,
} from "./kratos-flows.ts";

// ── Queries: create flow ────────────────────────────────────────────────────
export {
  LoginFlowCreated,
  createLoginFlowQueryKey,
  createLoginFlowQueryOptions,
  useCreateLoginFlowQuery,
} from "./queries/create-login-flow.ts";
export {
  RegistrationFlowCreated,
  createRegistrationFlowQueryKey,
  createRegistrationFlowQueryOptions,
  useCreateRegistrationFlowQuery,
} from "./queries/create-registration-flow.ts";
export {
  RecoveryFlowCreated,
  createRecoveryFlowQueryKey,
  createRecoveryFlowQueryOptions,
  useCreateRecoveryFlowQuery,
} from "./queries/create-recovery-flow.ts";
export {
  SettingsFlowCreated,
  createSettingsFlowQueryKey,
  createSettingsFlowQueryOptions,
  useCreateSettingsFlowQuery,
} from "./queries/create-settings-flow.ts";
export {
  VerificationFlowCreated,
  createVerificationFlowQueryKey,
  createVerificationFlowQueryOptions,
  useCreateVerificationFlowQuery,
} from "./queries/create-verification-flow.ts";

// ── Queries: get flow by id ─────────────────────────────────────────────────
export {
  LoginFlowFetched,
  getLoginFlowQueryKey,
  getLoginFlowQueryOptions,
  useGetLoginFlowQuery,
} from "./queries/get-login-flow.ts";
export {
  RegistrationFlowFetched,
  getRegistrationFlowQueryKey,
  getRegistrationFlowQueryOptions,
  useGetRegistrationFlowQuery,
} from "./queries/get-registration-flow.ts";
export {
  RecoveryFlowFetched,
  getRecoveryFlowQueryKey,
  getRecoveryFlowQueryOptions,
  useGetRecoveryFlowQuery,
} from "./queries/get-recovery-flow.ts";
export {
  SettingsFlowFetched,
  getSettingsFlowQueryKey,
  getSettingsFlowQueryOptions,
  useGetSettingsFlowQuery,
} from "./queries/get-settings-flow.ts";
export {
  VerificationFlowFetched,
  getVerificationFlowQueryKey,
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
