<template>
  <v-form ref="formRef" @submit.prevent="onSave">
    <div class="text-subtitle-1 mb-2">
      {{ t(strings.displayNameSectionTitle) }}
    </div>
    <v-text-field
      v-model="displayName"
      v-bind="t(strings.displayName)"
      maxlength="80"
      :rules="displayNameRules"
      class="mb-2"
      data-testid="profile-display-name"
    />

    <div class="text-subtitle-1 mt-4 mb-2">
      {{ t(strings.emailSectionTitle) }}
    </div>
    <v-checkbox
      v-model="marketingEmailsOptIn"
      :label="t(strings.marketingEmailsOptIn)"
      hide-details
      class="mt-0"
      data-testid="profile-marketing-opt-in"
    />
    <p class="text-body-2 text-medium-emphasis mb-4 ms-10">
      {{ t(strings.marketingEmailsOptInHelper) }}
    </p>

    <v-alert
      v-if="saveSuccess"
      type="success"
      density="compact"
      variant="tonal"
      class="mt-4"
    >
      {{ t(strings.saveSuccess) }}
    </v-alert>

    <v-alert
      v-if="saveError"
      type="error"
      density="compact"
      variant="tonal"
      class="mt-4"
      closable
      @click:close="saveError = null"
    >
      {{ saveError }}
    </v-alert>

    <div class="d-flex justify-end mt-4">
      <v-btn
        color="primary"
        type="submit"
        :loading="saveMutation.isPending.value"
        data-testid="profile-save"
      >
        {{ t(strings.save) }}
      </v-btn>
    </div>
  </v-form>
</template>

<script setup lang="ts">
import { usePutMineUserConfigsMutation } from "@saflib/base-sdk/requests/user-configs/put-mine";
import { getTanstackErrorMessage, TanstackError } from "@saflib/sdk";
import { computed, ref, watch } from "vue";
import type { VForm } from "vuetify/components";
import {
  buildPutMineUserConfigsBody,
  isDisplayNameValid,
  type ProfileFormValues,
} from "./Profile.logic.ts";
import { profile_form as strings } from "./Profile.strings.ts";
import { useReverseT } from "@saflib/base-account-spa/i18n";

const props = defineProps<{
  initialValues: ProfileFormValues;
}>();

const { t } = useReverseT();
const saveMutation = usePutMineUserConfigsMutation();

const displayName = ref(props.initialValues.displayName);
const marketingEmailsOptIn = ref(props.initialValues.marketingEmailsOptIn);
const saveSuccess = ref(false);
const saveError = ref<string | null>(null);
const formRef = ref<VForm | null>(null);

const displayNameRules = computed(() => [
  (value: string) =>
    isDisplayNameValid(value) || t(strings.displayNameRequired),
]);

watch(
  () => props.initialValues,
  (next) => {
    displayName.value = next.displayName;
    marketingEmailsOptIn.value = next.marketingEmailsOptIn;
  },
  { deep: true },
);

function profileSaveErrorMessage(error: unknown): string {
  if (error instanceof TanstackError) {
    return getTanstackErrorMessage(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return t(strings.saveErrorFallback);
}

async function onSave() {
  saveSuccess.value = false;
  saveError.value = null;

  const validation = await formRef.value?.validate();
  if (validation != null && !validation.valid) {
    return;
  }

  saveMutation.mutate(
    buildPutMineUserConfigsBody({
      displayName: displayName.value,
      marketingEmailsOptIn: marketingEmailsOptIn.value,
    }),
    {
      onSuccess: () => {
        saveSuccess.value = true;
      },
      onError: (error: unknown) => {
        saveError.value = profileSaveErrorMessage(error);
      },
    },
  );
}
</script>
