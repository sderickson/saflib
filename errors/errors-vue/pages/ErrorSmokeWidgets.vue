<template>
  <div class="d-flex flex-wrap ga-3">
    <v-btn variant="outlined" color="error" @click="onTestVueError">
      test vue error
    </v-btn>
    <v-btn
      variant="outlined"
      color="error"
      :loading="postTestError.isPending.value"
      @click="onTestBackendError"
    >
      test backend error
    </v-btn>
    <v-btn variant="outlined" color="warning" @click="onTestCspViolation">
      test CSP violation
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { usePostAdminTestErrorMutation } from "@saflib/errors-sdk";
import { onMounted, onUnmounted } from "vue";
import { getTanstackErrorMessage, TanstackError } from "@saflib/sdk";
import { showError } from "@saflib/vue";

const props = withDefaults(
  defineProps<{
    subdomain?: string;
  }>(),
  { subdomain: "api" },
);

const postTestError = usePostAdminTestErrorMutation(props.subdomain);

let expectCspViolationFeedback = false;
let cspViolationFeedbackTimer: number | undefined;
let removeCspListener: (() => void) | undefined;

onMounted(() => {
  const onViolation = () => {
    if (!expectCspViolationFeedback) {
      return;
    }
    expectCspViolationFeedback = false;
    if (cspViolationFeedbackTimer !== undefined) {
      clearTimeout(cspViolationFeedbackTimer);
      cspViolationFeedbackTimer = undefined;
    }
    showError({
      message:
        "CSP violation observed; the browser POSTed the report to /csp-violations. Check the Errors page and Sentry when configured.",
    });
  };
  document.addEventListener("securitypolicyviolation", onViolation);
  removeCspListener = () =>
    document.removeEventListener("securitypolicyviolation", onViolation);
});

onUnmounted(() => {
  if (cspViolationFeedbackTimer !== undefined) {
    clearTimeout(cspViolationFeedbackTimer);
  }
  removeCspListener?.();
});

function showTestErrorFeedback(surface: "vue" | "backend", detail?: string) {
  const message =
    surface === "vue"
      ? "Thrown a test Vue error — check the Errors page (and Sentry when configured)."
      : `Backend test error: ${detail ?? "request failed"}. Check the Errors page.`;
  showError({ message });
}

function onTestCspViolation() {
  expectCspViolationFeedback = true;
  if (cspViolationFeedbackTimer !== undefined) {
    clearTimeout(cspViolationFeedbackTimer);
  }
  cspViolationFeedbackTimer = window.setTimeout(() => {
    if (expectCspViolationFeedback) {
      expectCspViolationFeedback = false;
      showError({
        message:
          "No CSP violation within 2s — check that HTML CSP includes report-uri for this API, or try again.",
      });
    }
    cspViolationFeedbackTimer = undefined;
  }, 2000);
  const img = new Image();
  img.src = `https://example.com/csp-violation-probe?t=${Date.now()}`;
}

function onTestVueError() {
  showTestErrorFeedback("vue");
  queueMicrotask(() => {
    throw new Error(
      `Intentional test vue error (admin home) id=${crypto.randomUUID()}`,
    );
  });
}

function onTestBackendError() {
  postTestError.mutate(undefined, {
    onError: (error: unknown) => {
      const detail =
        error instanceof TanstackError
          ? `${getTanstackErrorMessage(error)} (HTTP ${error.status})`
          : error instanceof Error
            ? error.message
            : String(error ?? "Unknown error");
      showTestErrorFeedback("backend", detail);
    },
  });
}
</script>
