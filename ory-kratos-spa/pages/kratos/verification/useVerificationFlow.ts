import type { UiText } from "@ory/client";
import { ref, type MaybeRefOrGetter, toValue } from "vue";
import {
  useUpdateVerificationFlowMutation,
  VerificationFlowUpdated,
} from "@saflib/ory-kratos-sdk";
import { useAuthPostAuthFallbackHref } from "../../../authFallbackInject.ts";
import type { KratosFlowUiMessageFilterContext } from "../common/kratosUiMessages.ts";
import {
  buildVerificationUpdateBodyFromFormData,
  destinationAfterVerification,
  verificationFlowIsComplete,
} from "./Verification.logic.ts";

/**
 * Submit verification steps for an active flow (email → code → done). Starting a browser flow is handled by
 * {@link useNewVerificationEntryHref} / the `/new-verification` route.
 */
export function useVerificationFlow(
  verificationToken: MaybeRefOrGetter<string | undefined>,
  flowId: MaybeRefOrGetter<string>,
) {
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const updateVerification = useUpdateVerificationFlowMutation();

  const submitting = ref(false);
  const submitError = ref<string | null>(null);

  function clearSubmitError() {
    submitError.value = null;
  }

  /**
   * Hides Kratos flow-level **info** copy (e.g. “a code was sent…”) until the first submit, so email-link
   * entry isn’t buried in a long banner before the user acts.
   */
  const verificationSubmitCount = ref(0);

  function verificationMessageFilter(
    msg: UiText,
    ctx: KratosFlowUiMessageFilterContext,
  ): boolean {
    if (verificationSubmitCount.value > 0) return true;
    if (ctx.kind === "flow" && msg.type === "info") return false;
    return true;
  }

  async function submitVerificationForm(form: HTMLFormElement) {
    const fd = new FormData(form);
    verificationSubmitCount.value += 1;
    submitting.value = true;
    submitError.value = null;
    try {
      const id = toValue(flowId);
      const token = toValue(verificationToken);
      const updated = await updateVerification.mutateAsync({
        flow: id,
        updateVerificationFlowBody: buildVerificationUpdateBodyFromFormData(fd),
        ...(token ? { token } : {}),
      });

      if (!(updated instanceof VerificationFlowUpdated)) {
        throw new Error("Unexpected result");
      }

      if (verificationFlowIsComplete(updated.flow)) {
        window.location.assign(
          destinationAfterVerification(
            updated.flow.return_to,
            postAuthFallbackHref.value,
          ),
        );
      }
    } finally {
      submitting.value = false;
    }
  }

  return {
    submitting,
    submitError,
    clearSubmitError,
    submitVerificationForm,
    verificationMessageFilter,
  };
}
