import { computed, ref, watch, type Ref } from "vue";
import type { Session, VerificationFlow } from "@ory/client";
import {
  useUpdateVerificationFlowMutation,
  VerificationFlowUpdated,
} from "@saflib/ory-kratos-sdk";
import { useAuthPostAuthFallbackHref } from "../../authFallbackInject.ts";
import {
  buildVerificationCodeBody,
  buildVerificationResendCodeBody,
  canSubmitVerificationCode,
  destinationAfterVerification,
  emailForVerificationResend,
  verificationFlowIsComplete,
} from "./Verification.logic.ts";

/**
 * Submit/resend for a stub verification flow (registration handoff). Keeps a local
 * copy of the flow so CSRF tokens from update responses stay current.
 */
export function useVerificationStubFlow(args: {
  flow: Ref<VerificationFlow | null>;
  session: Ref<Session | null | undefined>;
  /** When true, auto-submit email once to request a code for a newly created flow. */
  needsEmailBootstrap: Ref<boolean>;
}) {
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const updateVerification = useUpdateVerificationFlowMutation();

  const currentFlow = ref<VerificationFlow | null>(null);
  watch(
    () => args.flow.value,
    (flow) => {
      if (!flow) {
        return;
      }
      if (
        currentFlow.value == null ||
        currentFlow.value.id !== flow.id ||
        (currentFlow.value.ui?.nodes?.length ?? 0) === 0
      ) {
        currentFlow.value = flow;
      }
    },
    { immediate: true },
  );

  const code = ref("");
  const submitError = ref<string | null>(null);
  const resendInfo = ref<string | null>(null);
  const bootstrapping = ref(false);
  const bootstrapDone = ref(false);

  const email = computed(() =>
    emailForVerificationResend(args.session.value, currentFlow.value),
  );

  const canSubmit = computed(() => canSubmitVerificationCode(code.value));
  const isPending = computed(() => updateVerification.isPending.value);

  async function applyUpdatedFlow(updated: VerificationFlowUpdated) {
    currentFlow.value = updated.flow;
    if (verificationFlowIsComplete(updated.flow)) {
      window.location.assign(
        destinationAfterVerification(
          updated.flow.return_to,
          postAuthFallbackHref.value,
        ),
      );
      return true;
    }
    return false;
  }

  watch(
    [currentFlow, () => args.needsEmailBootstrap.value, email],
    async ([flow, needsBootstrap, emailValue]) => {
      if (!needsBootstrap || bootstrapDone.value || bootstrapping.value) {
        return;
      }
      if (!flow || !emailValue) {
        return;
      }
      bootstrapping.value = true;
      try {
        const updated = await updateVerification.mutateAsync({
          flow: flow.id,
          updateVerificationFlowBody: buildVerificationResendCodeBody(
            flow,
            emailValue,
          ),
        });
        if (!(updated instanceof VerificationFlowUpdated)) {
          throw new Error("Unexpected result");
        }
        currentFlow.value = updated.flow;
        bootstrapDone.value = true;
        args.needsEmailBootstrap.value = false;
      } catch {
        submitError.value = "Could not send a verification code. Try again.";
      } finally {
        bootstrapping.value = false;
      }
    },
    { immediate: true },
  );

  async function submitCode() {
    const flow = currentFlow.value;
    if (!flow || !canSubmit.value || isPending.value) {
      return;
    }
    submitError.value = null;
    resendInfo.value = null;
    try {
      const updated = await updateVerification.mutateAsync({
        flow: flow.id,
        updateVerificationFlowBody: buildVerificationCodeBody(flow, code.value),
      });
      if (!(updated instanceof VerificationFlowUpdated)) {
        throw new Error("Unexpected result");
      }
      const done = await applyUpdatedFlow(updated);
      if (!done) {
        submitError.value = "Verification failed. Check the code and try again.";
      }
    } catch {
      submitError.value = "Verification failed. Check the code and try again.";
    }
  }

  async function resendCode() {
    const flow = currentFlow.value;
    const emailValue = email.value;
    if (!flow || !emailValue || isPending.value) {
      return;
    }
    submitError.value = null;
    resendInfo.value = null;
    try {
      const updated = await updateVerification.mutateAsync({
        flow: flow.id,
        updateVerificationFlowBody: buildVerificationResendCodeBody(
          flow,
          emailValue,
        ),
      });
      if (!(updated instanceof VerificationFlowUpdated)) {
        throw new Error("Unexpected result");
      }
      currentFlow.value = updated.flow;
      resendInfo.value = "A new verification code was sent.";
    } catch {
      submitError.value = "Could not send a verification code. Try again.";
    }
  }

  return {
    code,
    email,
    submitError,
    resendInfo,
    canSubmit,
    isPending,
    bootstrapping,
    activeFlow: currentFlow,
    submitCode,
    resendCode,
  };
}
