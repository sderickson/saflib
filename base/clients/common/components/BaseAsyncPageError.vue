<template>
  <v-alert
    :type="isEmailGate ? 'warning' : 'error'"
    :variant="isEmailGate ? 'tonal' : undefined"
    class="my-4"
  >
    <div>{{ displayMessage }}</div>
    <div v-if="actionCta" class="mt-3">
      <v-btn
        color="primary"
        variant="flat"
        size="small"
        :href="actionCta.href"
        rel="noopener"
      >
        {{ actionCta.label }}
      </v-btn>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { TanstackError } from "@saflib/sdk";
import { useReverseT } from "../i18n.ts";
import { async_page_error as strings } from "./BaseAsyncPageError.strings.ts";
import {
  baseAccessErrorAction,
  baseVerifyEmailHref,
  isEmailVerificationRequiredError,
  resolveBaseAccessErrorKind,
} from "../utils/access-error.logic.ts";

const props = defineProps<{
  error?: unknown;
  message?: string;
}>();

const { t } = useReverseT();

const isEmailGate = computed(() =>
  isEmailVerificationRequiredError(props.error),
);

const actionCta = computed(() => {
  if (props.message) return null;
  if (isEmailGate.value) {
    return {
      label: t(strings.verify_email),
      href: baseVerifyEmailHref(),
    };
  }
  const action = baseAccessErrorAction(props.error);
  if (!action) return null;
  if (resolveBaseAccessErrorKind(props.error) === "mfa") {
    return { ...action, label: t(strings.sign_in_with_second_factor) };
  }
  return action;
});

const displayMessage = computed(() => {
  if (props.message) return props.message;
  const error = props.error;
  if (!error) return t(strings.unexpected);
  const kind = resolveBaseAccessErrorKind(error);
  if (kind === "email") return t(strings.email_verification_required);
  if (kind === "mfa") return t(strings.mfa_required);
  if (kind === "login") return t(strings.login_required);
  if (kind === "payment") return t(strings.payment_required);
  if (!(error instanceof TanstackError)) {
    return t(strings.unexpected);
  }
  switch (error.status) {
    case 403:
      return t(strings.forbidden);
    case 404:
      return t(strings.not_found);
    case 500:
      return t(strings.server_error);
    case 0:
      return t(strings.connection_error);
    default:
      return t(strings.failed_to_load, { status: String(error.status) });
  }
});
</script>
