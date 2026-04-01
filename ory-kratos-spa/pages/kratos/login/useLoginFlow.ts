import { computed, ref, type Ref } from "vue";
import { useAuthPostAuthFallbackHref } from "../../../authFallbackInject.ts";
import {
  BrowserRedirectRequired,
  LoginCompleted,
  LoginFlowUpdated,
  useUpdateLoginFlowMutation,
} from "@saflib/ory-kratos-sdk";
import {
  buildLoginFormData,
  buildLoginUpdateBodyFromFormData,
} from "./Login.logic.ts";
import { kratosSubmitErrorMessage } from "../common/kratosErrorMessage.ts";
import { kratos_login_flow } from "./LoginFlowForm.strings.ts";
import type { LoginFlow } from "@ory/client";
/**
 * Submit login for an existing login flow. Flow creation and `?flow=` URL sync live on the page
 * (`Login.vue` + loader).
 */
export function useLoginFlow(flow: Ref<LoginFlow>) {
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const updateLogin = useUpdateLoginFlowMutation();

  const returnTo = computed(
    () => flow.value.return_to ?? postAuthFallbackHref.value,
  );

  const submitting = ref(false);
  const submitError = ref<string | null>(null);

  function clearSubmitError() {
    submitError.value = null;
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
      window.location.assign(returnTo.value);
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
