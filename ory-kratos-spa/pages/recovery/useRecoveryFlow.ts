import {
  type ErrorBrowserLocationChangeRequired,
  type RecoveryFlow,
  RecoveryFlowState,
} from "@ory/client";
import { ref, type MaybeRefOrGetter, toValue } from "vue";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import { useAuthPostAuthFallbackHref } from "../../authFallbackInject.ts";
import {
  BrowserRedirectRequired,
  RecoveryFlowUpdated,
  useUpdateRecoveryFlowMutation,
} from "@saflib/ory-kratos-sdk";
import { kratosSubmitErrorMessage } from "../common/kratosErrorMessage.ts";
import {
  buildRecoveryUpdateBodyFromFormData,
  destinationAfterRecovery,
  formDataFromrecoveryForm,
  recoveryFlowContinueWithUrl,
  resolveRecoveryBrowserRedirectUrl,
} from "./Recovery.logic.ts";
import { kratos_recovery_flow as flowStrings } from "./RecoveryFlowForm.strings.ts";

/**
 * Submit recovery flow steps. Browser flow creation is handled by `/new-recovery`.
 */
export function useRecoveryFlow(
  recoveryToken: MaybeRefOrGetter<string | undefined>,
  flowId: MaybeRefOrGetter<string>,
) {
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const updateRecovery = useUpdateRecoveryFlowMutation();

  const submitting = ref(false);
  const submitError = ref<string | null>(null);

  function clearSubmitError() {
    submitError.value = null;
  }

  function settingsFlowHrefFromId(settingsFlowId: string): string {
    return linkToHrefWithHost(authLinks.settings, {
      params: { flow: settingsFlowId },
    });
  }

  function applyBrowserLocationChangeRequired(
    body: ErrorBrowserLocationChangeRequired,
  ) {
    const raw = body.redirect_browser_to?.trim();
    if (!raw) return;
    const url = resolveRecoveryBrowserRedirectUrl(raw);
    window.location.assign(url);
  }

  function applyRecoveryFlow(updated: RecoveryFlow) {
    const continueUrl = recoveryFlowContinueWithUrl(
      updated,
      settingsFlowHrefFromId,
    );
    if (continueUrl) {
      window.location.assign(continueUrl);
      return;
    }

    if (updated.state === RecoveryFlowState.PassedChallenge) {
      const fallback = destinationAfterRecovery(
        updated.return_to,
        postAuthFallbackHref.value,
      );
      window.location.assign(fallback);
    }
  }

  async function submitRecoveryForm(
    form: HTMLFormElement,
    submitter?: HTMLElement | null,
  ) {
    const id = toValue(flowId);
    if (!id || submitting.value) return;
    const fd = formDataFromrecoveryForm(form, submitter);
    submitting.value = true;
    submitError.value = null;
    try {
      let result;
      try {
        const token = toValue(recoveryToken);
        result = await updateRecovery.mutateAsync({
          flow: id,
          updateRecoveryFlowBody: buildRecoveryUpdateBodyFromFormData(fd),
          ...(token ? { token } : {}),
        });
      } catch (e) {
        submitError.value = kratosSubmitErrorMessage(
          e,
          flowStrings.recovery_failed,
        );
        return;
      }

      if (result instanceof BrowserRedirectRequired) {
        applyBrowserLocationChangeRequired(result.payload);
        return;
      }

      if (result instanceof RecoveryFlowUpdated) {
        applyRecoveryFlow(result.flow);
      }
    } finally {
      submitting.value = false;
    }
  }

  return {
    submitting,
    submitError,
    clearSubmitError,
    submitRecoveryForm,
  };
}
