<template>
  <EmailVerificationRequiredError
    v-if="isEmailVerificationRequiredError(error)"
  />
  <AsyncPageError v-else :error="error" :message="message" />
</template>

<script setup lang="ts">
import AsyncPageError from "./AsyncPageError.vue";
import EmailVerificationRequiredError from "./EmailVerificationRequiredError.vue";
import { isEmailVerificationRequiredError } from "../utils/access-error.logic.ts";

defineProps<{
  error?: unknown;
  message?: string;
}>();
</script>
