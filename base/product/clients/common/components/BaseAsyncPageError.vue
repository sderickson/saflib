<template>
  <v-alert
    :type="isAccessGate ? 'warning' : 'error'"
    :variant="isAccessGate ? 'tonal' : undefined"
    class="ma-4"
  >
    <div v-if="mfaProbePending" class="d-flex align-center ga-2">
      <v-progress-circular indeterminate size="20" />
      <span>{{ t(strings.mfa_checking) }}</span>
    </div>
    <template v-else>
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
      <v-alert
        v-if="mfaProbeError"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-3"
        :text="t(strings.mfa_probe_error)"
      />
    </template>
  </v-alert>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { TanstackError } from "@saflib/sdk";
import { useReverseT } from "#i18n.ts";
import { async_page_error as strings } from "./BaseAsyncPageError.strings.ts";
import {
  baseAccessErrorAction,
  baseVerifyEmailHref,
  isEmailVerificationRequiredError,
  probeBaseMfaRequirement,
  resolveBaseAccessErrorKind,
  type BaseMfaProbeResult,
} from "#utils/access-error.logic.ts";

const props = defineProps<{
  error?: unknown;
  message?: string;
}>();

const { t } = useReverseT();
const queryClient = useQueryClient();

const mfaProbePending = ref(false);
const mfaProbeError = ref(false);
const mfaProbeResult = ref<BaseMfaProbeResult | null>(null);

const isEmailGate = computed(() =>
  isEmailVerificationRequiredError(props.error),
);

const isMfaError = computed(
  () => !props.message && resolveBaseAccessErrorKind(props.error) === "mfa",
);

const isAccessGate = computed(
  () =>
    isEmailGate.value ||
    (isMfaError.value && mfaProbeResult.value?.kind === "setup"),
);

async function runMfaProbe(): Promise<void> {
  if (!isMfaError.value) {
    mfaProbePending.value = false;
    mfaProbeError.value = false;
    mfaProbeResult.value = null;
    return;
  }
  mfaProbePending.value = true;
  mfaProbeError.value = false;
  mfaProbeResult.value = null;
  try {
    const result = await probeBaseMfaRequirement(queryClient);
    if (result.kind === "error") {
      mfaProbeError.value = true;
      return;
    }
    mfaProbeResult.value = result;
  } finally {
    mfaProbePending.value = false;
  }
}

onMounted(() => {
  void runMfaProbe();
});

watch(
  () => props.error,
  () => {
    void runMfaProbe();
  },
);

const actionCta = computed(() => {
  if (props.message || mfaProbePending.value) return null;
  if (isEmailGate.value) {
    return {
      label: t(strings.verify_email),
      href: baseVerifyEmailHref(),
    };
  }
  if (isMfaError.value && mfaProbeResult.value) {
    if (mfaProbeResult.value.kind === "setup") {
      return {
        label: t(strings.set_up_mfa),
        href: mfaProbeResult.value.href,
      };
    }
    if (mfaProbeResult.value.kind === "step_up") {
      return {
        label: t(strings.sign_in_with_second_factor),
        href: mfaProbeResult.value.href,
      };
    }
  }
  if (isMfaError.value && mfaProbeError.value) {
    const action = baseAccessErrorAction(props.error);
    if (!action) return null;
    return { ...action, label: t(strings.sign_in_with_second_factor) };
  }
  const action = baseAccessErrorAction(props.error);
  if (!action) return null;
  return action;
});

const displayMessage = computed(() => {
  if (props.message) return props.message;
  if (mfaProbePending.value) return "";
  const error = props.error;
  if (!error) return t(strings.unexpected);
  const kind = resolveBaseAccessErrorKind(error);
  if (kind === "email") return t(strings.email_verification_required);
  if (kind === "mfa") {
    if (mfaProbeResult.value?.kind === "setup") {
      return t(strings.mfa_setup_required);
    }
    return t(strings.mfa_required);
  }
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
