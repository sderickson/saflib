import { ref, toValue, type MaybeRefOrGetter } from "vue";
import {
  BrowserRedirectRequired,
  useUpdateSettingsFlowMutation,
} from "@saflib/ory-kratos-sdk";
import { kratosSubmitErrorMessage } from "../common/kratosErrorMessage.ts";
import {
  buildSettingsUpdateBodyFromFormData,
  formDataFromKratosSettingsForm,
} from "./Settings.logic.ts";
import { settings_page as pageStrings } from "./Settings.strings.ts";

/**
 * Submit profile / password / TOTP updates for the active settings flow.
 */
export function useSettingsFlow(flowId: MaybeRefOrGetter<string>) {
  const updateSettings = useUpdateSettingsFlowMutation();

  const submitting = ref(false);
  const submitError = ref<string | null>(null);

  function clearSubmitError() {
    submitError.value = null;
  }

  async function submitSettingsForm(
    form: HTMLFormElement,
    submitter?: HTMLElement | null,
  ) {
    const id = toValue(flowId);
    if (!id) return;
    const fd = formDataFromKratosSettingsForm(form, submitter);
    submitting.value = true;
    submitError.value = null;
    try {
      const updated = await updateSettings.mutateAsync({
        flow: id,
        updateSettingsFlowBody: buildSettingsUpdateBodyFromFormData(fd),
      });
      if (updated instanceof BrowserRedirectRequired) {
        if (!updated.payload.redirect_browser_to) {
          throw new Error("Redirect browser to is required");
        }
        window.location.assign(updated.payload.redirect_browser_to);
        return;
      }
    } catch (e) {
      submitError.value = kratosSubmitErrorMessage(
        e,
        pageStrings.settings_failed,
      );
    } finally {
      submitting.value = false;
    }
  }

  return {
    submitting,
    submitError,
    clearSubmitError,
    submitSettingsForm,
  };
}
