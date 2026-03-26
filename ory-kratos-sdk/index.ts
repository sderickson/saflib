import "./vue-query-register.ts";

export { getKratosFrontendApi } from "./kratos-client.ts";
export {
  assertKratosSessionIdentityLoaded,
  fetchKratosSession,
  invalidateKratosSessionQueries,
  kratosIdentityEmail,
  kratosSessionQueryKey,
  kratosSessionQueryOptions,
  kratosSessionRequiredQueryKey,
  kratosSessionRequiredQueryOptions,
  useInvalidateKratosSession,
  useKratosSession,
} from "./kratos-session.ts";
export { identityNeedsEmailVerification } from "./kratos-identity.ts";
export { isKratosFlowGoneError } from "./kratos-http-error.ts";
export { kratosFlowQueryRetry } from "./kratos-query-retry.ts";
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
export {
  loginFlowQueryKey,
  loginFlowQueryOptions,
  useLoginFlowQuery,
} from "./login-flow-query.ts";
export {
  registrationFlowQueryKey,
  registrationFlowQueryOptions,
  useRegistrationFlowQuery,
} from "./registration-flow-query.ts";
export {
  RegistrationCompleted,
  RegistrationFlowUpdated,
  useUpdateRegistrationFlowMutation,
} from "./use-update-registration-flow.ts";
export {
  LoginCompleted,
  LoginFlowUpdated,
  useUpdateLoginFlowMutation,
} from "./use-update-login-flow.ts";
export {
  recoveryFlowQueryKey,
  recoveryFlowQueryOptions,
  useRecoveryFlowQuery,
} from "./recovery-flow-query.ts";
export {
  settingsFlowQueryKey,
  settingsFlowQueryOptions,
  useSettingsFlowQuery,
} from "./settings-flow-query.ts";
export {
  verificationFlowQueryKey,
  verificationFlowQueryOptions,
  useVerificationFlowQuery,
} from "./verification-flow-query.ts";
export {
  BrowserRedirectRequired,
  useUpdateRecoveryFlowMutation,
} from "./use-update-recovery-flow.ts";
export { useUpdateSettingsFlowMutation } from "./use-update-settings-flow.ts";
export { useUpdateVerificationFlowMutation } from "./use-update-verification-flow.ts";
