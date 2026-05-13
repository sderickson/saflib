<template>
  <v-alert type="error" class="my-4">
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
import type { Link } from "@saflib/links";
import { linkToHrefWithHost } from "@saflib/links";
import {
  TanstackError,
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/sdk";

const authNewVerification: Link = {
  subdomain: "auth",
  path: "/new-verification",
  params: ["return_to"],
};

const authNewSettings: Link = {
  subdomain: "auth",
  path: "/new-settings",
  params: ["return_to", "tab"],
};

const props = defineProps<{
  error?: unknown;
  message?: string;
}>();

function returnToParam(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const href = window.location.href;
  return href.trim() !== "" ? href : undefined;
}

const actionCta = computed((): { label: string; href: string } | null => {
  if (props.message) return null;
  const err = props.error;
  if (!(err instanceof TanstackError)) return null;
  if (err.status !== 403) return null;
  const rt = returnToParam();
  if (err.code === AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED) {
    return {
      label: "Verify email",
      href: rt
        ? linkToHrefWithHost(authNewVerification, {
            params: { return_to: rt },
          })
        : linkToHrefWithHost(authNewVerification),
    };
  }
  if (err.code === AUTH_ERROR_MFA_REQUIRED) {
    return {
      label: "Set up two-factor authentication",
      href: rt
        ? linkToHrefWithHost(authNewSettings, {
            params: { return_to: rt, tab: "totp" },
          })
        : linkToHrefWithHost(authNewSettings, {
            params: { tab: "totp" },
          }),
    };
  }
  return null;
});

const displayMessage = computed(() => {
  if (props.message) return props.message;
  const error = props.error;
  if (!error) return "An unexpected error occurred.";
  if (error instanceof TanstackError && error.status === 403) {
    if (error.code === AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED) {
      return "You need to verify your email address before you can continue.";
    }
    if (error.code === AUTH_ERROR_MFA_REQUIRED) {
      return "This page requires two-factor authentication on your account.";
    }
  }
  const status = (error as { status?: number })?.status;
  switch (status) {
    case 401:
      return "Not Logged In";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 500:
      return "Server Error";
    case 0:
      return "Connection Error";
    default:
      return `Failed to load data (Error ${status})`;
  }
});
</script>
