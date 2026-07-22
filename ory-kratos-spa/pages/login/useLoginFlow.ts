import { computed, ref, type Ref } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { linkToHref } from "@saflib/links";
import {
  useAuthPostAuthFallbackHref,
  useAuthPostAuthUrlIsOverride,
} from "../../authFallbackInject.ts";
import {
  BrowserRedirectRequired,
  createLoginFlowQueryOptions,
  LoginCompleted,
  LoginFlowCreated,
  LoginFlowUpdated,
  resolveMfaContinueHref,
  sessionSatisfiesMfa,
  useUpdateLoginFlowMutation,
} from "@saflib/ory-kratos-sdk";
import { kratosAal2ParamValue } from "@saflib/ory-kratos-sdk/links";
import {
  buildLoginFormData,
  buildLoginUpdateBodyFromFormData,
} from "./Login.logic.ts";
import { kratosSubmitErrorMessage } from "../common/kratosErrorMessage.ts";
import { kratos_login_flow } from "./LoginFlowForm.strings.ts";
import type { LoginFlow } from "@ory/client";

const accountDomain = () => document.location.host.replace("auth.", "");

function mfaSetupHref(): string {
  return linkToHref(
    { subdomain: "account", path: "/mfa" },
    { domain: accountDomain() },
  );
}

/**
 * Submit login for an existing login flow. Flow creation and `?flow=` URL sync live on the page
 * (`Login.vue` + loader).
 *
 * After password (AAL1) success, probes an AAL2 login flow and redirects to MFA challenge or
 * account MFA setup instead of bouncing through the app MFA wall. Completing AAL2 goes to
 * `return_to` as before.
 */
export function useLoginFlow(flow: Ref<LoginFlow>) {
  const queryClient = useQueryClient();
  const postAuthHref = useAuthPostAuthFallbackHref();
  const postAuthIsOverride = useAuthPostAuthUrlIsOverride();
  const updateLogin = useUpdateLoginFlowMutation();

  const returnTo = computed(() =>
    postAuthIsOverride.value
      ? postAuthHref.value
      : (flow.value.return_to ?? postAuthHref.value),
  );

  const submitting = ref(false);
  const submitError = ref<string | null>(null);

  function clearSubmitError() {
    submitError.value = null;
  }

  async function redirectAfterLoginCompleted(
    completed: LoginCompleted,
  ): Promise<void> {
    const session = completed.session.session;
    if (sessionSatisfiesMfa(session?.authenticator_assurance_level)) {
      window.location.assign(returnTo.value);
      return;
    }

    try {
      const created = await queryClient.fetchQuery({
        ...createLoginFlowQueryOptions({
          returnTo: returnTo.value,
          aal: kratosAal2ParamValue,
        }),
        staleTime: 0,
      });
      if (created instanceof LoginFlowCreated) {
        window.location.assign(
          resolveMfaContinueHref(created.flow, mfaSetupHref()),
        );
        return;
      }
    } catch {
      // Fall through to return_to if the AAL2 probe fails.
    }
    window.location.assign(returnTo.value);
  }

  async function submitLoginForm(
    form: HTMLFormElement,
    submitter?: HTMLElement | null,
  ) {
    submitting.value = true;
    submitError.value = null;
    try {
      const fd = buildLoginFormData(form, submitter ?? null);
      const result = await updateLogin.mutateAsync({
        flow: flow.value.id,
        updateLoginFlowBody: buildLoginUpdateBodyFromFormData(fd),
      });
      if (result instanceof BrowserRedirectRequired) {
        if (!result.payload.redirect_browser_to) {
          throw new Error("Redirect browser to is required");
        }
        window.location.assign(result.payload.redirect_browser_to);
        return;
      }
      if (result instanceof LoginFlowUpdated) {
        return;
      }
      if (!(result instanceof LoginCompleted)) {
        throw new Error("Unexpected result");
      }
      await redirectAfterLoginCompleted(result);
    } catch (e) {
      submitError.value = kratosSubmitErrorMessage(
        e,
        kratos_login_flow.login_failed,
      );
    } finally {
      submitting.value = false;
    }
  }

  return {
    submitting,
    submitError,
    clearSubmitError,
    submitLoginForm,
  };
}
