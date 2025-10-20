<template>
  <h1>{{ t(strings.page_title) }}</h1>

  <v-breadcrumbs class="pl-0 mb-4">
    <v-breadcrumbs-item to="/">{{
      t(strings.breadcrumb_account)
    }}</v-breadcrumbs-item>
    <v-breadcrumbs-divider>></v-breadcrumbs-divider>
    <v-breadcrumbs-item>{{
      t(strings.breadcrumb_edit_security)
    }}</v-breadcrumbs-item>
  </v-breadcrumbs>

  <PasswordForm ref="passwordFormRef" v-model="passwordFormData" />

  <v-btn
    class="my-4"
    color="primary"
    :disabled="isFormDisabled"
    :loading="setPasswordMutation.isPending.value"
    block
    @click="handleSave"
  >
    {{ t(strings.save_button) }}
  </v-btn>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { account_password_page as strings } from "./AccountPasswordPage.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { useAccountPasswordPageLoader } from "./AccountPasswordPage.loader.ts";
import {
  PasswordForm,
  type PasswordFormModel,
} from "@saflib/account-sdk/components";
import { useSetPassword } from "@saflib/auth";
import { useRouter } from "vue-router";
import { showError } from "@saflib/vue";

useAccountPasswordPageLoader();

const { t } = useReverseT();

const passwordFormRef = ref();
const passwordFormData = ref<PasswordFormModel>({
  currentPassword: "",
  newPassword: "",
  newPasswordConfirmation: "",
});

const setPasswordMutation = useSetPassword();

const isFormValid = computed(() => {
  return passwordFormRef.value?.isValid ?? false;
});

const isFormDisabled = computed(() => {
  return !isFormValid.value || setPasswordMutation.isPending.value;
});

const router = useRouter();

const handleSave = async () => {
  if (!isFormValid.value) return;
  try {
    await setPasswordMutation.mutateAsync({
      currentPassword: passwordFormData.value.currentPassword,
      newPassword: passwordFormData.value.newPassword,
    });

    router.push("/");
  } catch {
    showError(t(strings.error_saving_password));
  }
};
</script>
