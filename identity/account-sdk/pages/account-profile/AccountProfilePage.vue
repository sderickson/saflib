<template>
  <v-container>
    <h1>{{ t(strings.page_title) }}</h1>

    <v-breadcrumbs class="pl-0 mb-4">
      <v-breadcrumbs-item to="/">{{
        t(strings.breadcrumb_account)
      }}</v-breadcrumbs-item>
      <v-breadcrumbs-divider>></v-breadcrumbs-divider>
      <v-breadcrumbs-item>{{
        t(strings.breadcrumb_edit_personal_details)
      }}</v-breadcrumbs-item>
    </v-breadcrumbs>

    <v-card class="pa-6 mb-6" elevation="0" border color="transparent">
      <ProfileForm ref="profileFormRef" v-model="profileFormData" />

      <v-btn
        class="mt-4"
        color="primary"
        :disabled="isFormDisabled"
        :loading="updateProfileMutation.isPending.value"
        block
        @click="handleSave"
      >
        {{ t(strings.save_button) }}
      </v-btn>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { account_profile_page as strings } from "./AccountProfilePage.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { useAccountProfilePageLoader } from "./AccountProfilePage.loader.ts";
import {
  ProfileForm,
  type ProfileFormModel,
} from "@saflib/account-sdk/components";
import { useUpdateProfile } from "@saflib/auth";
import { useRouter } from "vue-router";
import { showError } from "@saflib/vue";

const { profileQuery } = useAccountProfilePageLoader();
const { t } = useReverseT();

if (!profileQuery.data.value) {
  throw new Error("Failed to load profile");
}

const profileFormRef = ref();
const profileFormData = ref<ProfileFormModel>({
  firstName: profileQuery.data.value.givenName || "",
  lastName: profileQuery.data.value.familyName || "",
  email: profileQuery.data.value.email || "",
});

const updateProfileMutation = useUpdateProfile();

const isFormValid = computed(() => {
  return profileFormRef.value?.isValid ?? false;
});

const isFormDisabled = computed(() => {
  return !isFormValid.value || updateProfileMutation.isPending.value;
});

const router = useRouter();

const handleSave = async () => {
  if (!isFormValid.value) return;
  try {
    await updateProfileMutation.mutateAsync({
      givenName: profileFormData.value.firstName,
      familyName: profileFormData.value.lastName,
      email: profileFormData.value.email,
    });

    router.push("/");
  } catch {
    showError(t(strings.error_saving_profile));
  }
};
</script>
