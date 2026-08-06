import type { RegistrationFlow, UiText } from "@ory/client";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import {
  createLoginFlowQueryOptions,
  LoginFlowCreated,
  RegistrationFlowUpdated,
  useUpdateLoginFlowMutation,
  useUpdateRegistrationFlowMutation,
  BrowserRedirectRequired,
  RegistrationCompleted,
  LoginCompleted,
  SessionAlreadyAvailable,
  UnhandledResponse,
} from "@saflib/ory-kratos-sdk";
import {
  useAuthPostRegisterFallbackHref,
  useAuthPostRegisterUrlIsOverride,
} from "../../authFallbackInject.ts";
import type { KratosFlowUiMessageFilterContext } from "../common/kratosUiMessages.ts";
import { isKratosPropertyMissingMessage } from "../common/kratosUiMessages.ts";
import {
  buildLoginPasswordBody,
  buildRegistrationUpdateBodyFromFormData,
  registrationSubmitErrorMessage,
  traitsEmailFromFormData,
  verificationFlowIdFromRegistrationContinueWith,
} from "./Registration.logic.ts";
import { kratos_registration_flow as flowStrings } from "./RegistrationFlowForm.strings.ts";

export type UseRegistrationFlowOptions = {
  /**
   * Run after FormData is collected and before the Kratos update.
   * Return an error string to block submit (e.g. host-owned required fields).
   */
  beforeSubmit?: (fd: FormData) => string | null | Promise<string | null>;
  /**
   * Run after the account (and session, when applicable) exists, before navigating
   * away from registration. Errors are soft-failed so the user is not stuck.
   */
  afterRegistration?: (fd: FormData) => void | Promise<void>;
};

/**
 * Submit and post-login navigation for an existing registration flow.
 * Flow creation and `?flow=` URL sync live on the page (`Registration.vue` + loader).
 */
export function useRegistrationFlow(
  flow: Ref<RegistrationFlow>,
  options: MaybeRefOrGetter<UseRegistrationFlowOptions> = {},
) {
  const queryClient = useQueryClient();
  const updateRegistration = useUpdateRegistrationFlowMutation();
  const updateLogin = useUpdateLoginFlowMutation();

  const submitting = ref(false);
  const submitError = ref<string | null>(null);

  function clearSubmitError() {
    submitError.value = null;
  }
  const postRegisterHref = useAuthPostRegisterFallbackHref();
  const postRegisterIsOverride = useAuthPostRegisterUrlIsOverride();

  /**
   * Used to hide Kratos "Property password is missing" on the first response after submitting email
   * only (multi-step password UI). Second submit with an empty password shows the message.
   */
  const registrationSubmitCount = ref(0);

  function registrationMessageFilter(
    msg: UiText,
    _ctx: KratosFlowUiMessageFilterContext,
  ): boolean {
    if (registrationSubmitCount.value !== 1) return true;
    if (!isKratosPropertyMissingMessage(msg)) return true;
    const prop = (msg.context as { property?: string } | undefined)?.property;
    if (prop !== "password") return true;
    return false;
  }

  function destinationWithOptionalVerificationFlow(
    destination: string,
    continueWith: RegistrationCompleted["result"]["continue_with"],
  ): string {
    const flowId = verificationFlowIdFromRegistrationContinueWith(continueWith);
    if (!flowId) {
      return destination;
    }
    try {
      const url = new URL(destination);
      url.searchParams.set("flow", flowId);
      return url.toString();
    } catch {
      const join = destination.includes("?") ? "&" : "?";
      return `${destination}${join}flow=${encodeURIComponent(flowId)}`;
    }
  }

  async function runAfterRegistration(fd: FormData): Promise<void> {
    try {
      await toValue(options).afterRegistration?.(fd);
    } catch {
      // Host can capture missing profile data later (e.g. onboarding).
    }
  }

  async function navigateAfterRegistration(
    destination: string,
    continueWith: RegistrationCompleted["result"]["continue_with"],
    fd: FormData,
  ): Promise<void> {
    await runAfterRegistration(fd);
    window.location.assign(
      destinationWithOptionalVerificationFlow(destination, continueWith),
    );
  }

  async function submitRegistrationForm(form: HTMLFormElement) {
    const fd = new FormData(form);
    const beforeError = await toValue(options).beforeSubmit?.(fd);
    if (beforeError) {
      submitError.value = beforeError;
      return;
    }

    registrationSubmitCount.value += 1;
    submitting.value = true;
    submitError.value = null;
    /** When true, keep the form in its loading state until the browser navigates away (avoid flashing stale Kratos errors). */
    let keepSubmittingUntilNavigation = false;
    try {
      const updated = await updateRegistration.mutateAsync({
        flow: flow.value.id,
        updateRegistrationFlowBody: buildRegistrationUpdateBodyFromFormData(fd),
      });
      if (updated instanceof BrowserRedirectRequired) {
        if (!updated.payload.redirect_browser_to) {
          throw new Error("Redirect browser to is required");
        }
        window.location.assign(updated.payload.redirect_browser_to);
        keepSubmittingUntilNavigation = true;
        return;
      }
      if (updated instanceof RegistrationFlowUpdated) {
        return;
      }

      if (!(updated instanceof RegistrationCompleted)) {
        throw new Error("Unexpected result");
      }

      const destination = postRegisterIsOverride.value
        ? postRegisterHref.value
        : (flow.value.return_to ?? postRegisterHref.value);
      const registrationSession = updated.result.session;
      if (registrationSession) {
        await navigateAfterRegistration(
          destination,
          updated.result.continue_with,
          fd,
        );
        keepSubmittingUntilNavigation = true;
        return;
      }

      const email = traitsEmailFromFormData(fd);
      const password = String(fd.get("password") ?? "");
      if (!password.trim()) {
        window.location.assign(
          linkToHrefWithHost(authLinks.newLogin, {
            params: { return_to: destination },
          }),
        );
        keepSubmittingUntilNavigation = true;
        return;
      }
      const created = await queryClient.fetchQuery({
        ...createLoginFlowQueryOptions({ returnTo: destination }),
        staleTime: 0,
      });
      if (!(created instanceof LoginFlowCreated)) {
        if (
          created instanceof SessionAlreadyAvailable ||
          created instanceof UnhandledResponse
        ) {
          submitError.value = flowStrings.post_reg_login_failed;
          return;
        }
        throw new Error("Unexpected create login flow result");
      }
      const loginFlow = created.flow;
      const loginResult = await updateLogin.mutateAsync({
        flow: loginFlow.id,
        updateLoginFlowBody: buildLoginPasswordBody(loginFlow, email, password),
      });

      if (!(loginResult instanceof LoginCompleted)) {
        submitError.value = flowStrings.post_reg_login_failed;
        return;
      }

      await navigateAfterRegistration(
        destination,
        updated.result.continue_with,
        fd,
      );
      keepSubmittingUntilNavigation = true;
    } catch (e) {
      submitError.value = registrationSubmitErrorMessage(
        e,
        flowStrings.registration_failed,
      );
      return;
    } finally {
      if (!keepSubmittingUntilNavigation) {
        submitting.value = false;
      }
    }
  }

  return {
    submitting,
    submitError,
    clearSubmitError,
    submitRegistrationForm,
    registrationMessageFilter,
  };
}
