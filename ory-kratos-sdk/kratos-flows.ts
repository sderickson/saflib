import type {
  LoginFlow,
  LogoutFlow,
  RecoveryFlow,
  RegistrationFlow,
  SettingsFlow,
  VerificationFlow,
} from "@ory/client";
import { getKratosFrontendApi } from "./kratos-client.ts";

/** `returnTo` is sent to Kratos as `return_to` and echoed on {@link LoginFlow.return_to}. */
export async function fetchBrowserLoginFlow(returnTo?: string): Promise<LoginFlow> {
  const res = await getKratosFrontendApi().createBrowserLoginFlow(
    returnTo ? { returnTo } : {},
  );
  return res.data;
}

/** `returnTo` is sent to Kratos as `return_to` and echoed on {@link RegistrationFlow.return_to}. */
export async function fetchBrowserRegistrationFlow(
  returnTo?: string,
): Promise<RegistrationFlow> {
  const res = await getKratosFrontendApi().createBrowserRegistrationFlow(
    returnTo ? { returnTo } : {},
  );
  return res.data;
}

export async function fetchLoginFlowById(flowId: string): Promise<LoginFlow> {
  const res = await getKratosFrontendApi().getLoginFlow({ id: flowId });
  return res.data;
}

export async function fetchRegistrationFlowById(flowId: string): Promise<RegistrationFlow> {
  const res = await getKratosFrontendApi().getRegistrationFlow({ id: flowId });
  return res.data;
}

export async function fetchBrowserLogoutFlow(returnTo?: string): Promise<LogoutFlow> {
  const res = await getKratosFrontendApi().createBrowserLogoutFlow({ returnTo });
  return res.data;
}

/** `returnTo` is sent to Kratos as `return_to` and echoed on {@link VerificationFlow.return_to}. */
export async function fetchBrowserVerificationFlow(
  returnTo?: string,
): Promise<VerificationFlow> {
  const res = await getKratosFrontendApi().createBrowserVerificationFlow(
    returnTo ? { returnTo } : {},
  );
  return res.data;
}

export async function fetchVerificationFlowById(flowId: string): Promise<VerificationFlow> {
  const res = await getKratosFrontendApi().getVerificationFlow({ id: flowId });
  return res.data;
}

/** `returnTo` is sent to Kratos as `return_to` and echoed on {@link RecoveryFlow.return_to}. */
export async function fetchBrowserRecoveryFlow(returnTo?: string): Promise<RecoveryFlow> {
  const res = await getKratosFrontendApi().createBrowserRecoveryFlow(
    returnTo ? { returnTo } : {},
  );
  return res.data;
}

export async function fetchRecoveryFlowById(flowId: string): Promise<RecoveryFlow> {
  const res = await getKratosFrontendApi().getRecoveryFlow({ id: flowId });
  return res.data;
}

/** Alias for {@link fetchRecoveryFlowById} (matches Ory `getRecoveryFlow` naming). */
export const getRecoveryFlow = fetchRecoveryFlowById;

/** `returnTo` is sent to Kratos as `return_to` and echoed on {@link SettingsFlow.return_to}. */
export async function fetchBrowserSettingsFlow(returnTo?: string): Promise<SettingsFlow> {
  const res = await getKratosFrontendApi().createBrowserSettingsFlow(
    returnTo ? { returnTo } : {},
  );
  return res.data;
}

export async function fetchSettingsFlowById(flowId: string): Promise<SettingsFlow> {
  const res = await getKratosFrontendApi().getSettingsFlow({ id: flowId });
  return res.data;
}
