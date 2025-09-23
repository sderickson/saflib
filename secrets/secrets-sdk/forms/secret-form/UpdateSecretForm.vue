<template>
  <v-card>
    <v-card-title>
      <h2>{{ t(strings.title) }}</h2>
    </v-card-title>

    <v-card-subtitle>
      {{ t(strings.description) }}
    </v-card-subtitle>

    <v-card-text>
      <!-- Loading skeleton -->
      <div v-if="updateMutation.isPending.value" class="mb-4">
        <v-skeleton-loader
          type="table-heading, table-thead, table-tbody, table-tbody, table-tbody"
          class="elevation-1"
        ></v-skeleton-loader>
      </div>

      <v-alert
        v-else-if="updateMutation.error.value"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ getErrorMessage(updateMutation.error.value) }}
      </v-alert>

      <v-form v-else ref="form" v-model="isValid" @submit.prevent="onSubmit">
        <v-text-field
          v-model="formData.name"
          :label="t(strings.nameLabel)"
          :rules="nameRules"
          :disabled="updateMutation.isPending.value"
          required
          class="mb-4"
        ></v-text-field>

        <v-textarea
          v-model="formData.description"
          :label="t(strings.descriptionLabel)"
          :rules="descriptionRules"
          :disabled="updateMutation.isPending.value"
          rows="3"
          class="mb-4"
        ></v-textarea>

        <v-text-field
          v-model="formData.value"
          :label="t(strings.valueLabel)"
          :rules="valueRules"
          :disabled="updateMutation.isPending.value"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="showPassword = !showPassword"
          data-testid="password-toggle"
          required
          class="mb-4"
        ></v-text-field>

        <v-switch
          v-model="formData.is_active"
          :label="t(strings.activeLabel)"
          :disabled="updateMutation.isPending.value"
          class="mb-4"
        ></v-switch>

        <div class="d-flex gap-2">
          <v-btn
            type="submit"
            color="primary"
            :loading="updateMutation.isPending.value"
            :disabled="!isValid"
          >
            {{ t(strings.submitButton) }}
          </v-btn>

          <v-btn
            type="button"
            variant="outlined"
            :disabled="updateMutation.isPending.value"
            @click="onCancel"
          >
            {{ t(strings.cancelButton) }}
          </v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { update_secret_form_strings as strings } from "./UpdateSecretForm.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { getTanstackErrorMessage } from "@saflib/sdk";
import { useUpdateSecret } from "../../requests/secrets/update.ts";
import { ref, reactive, watch } from "vue";
import type { Secret, SecretUpdateRequest } from "@saflib/secrets-spec";

const { t } = useReverseT();

interface Props {
  secret: Secret;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  success: [secret: Secret];
  cancel: [];
}>();

const form = ref();
const isValid = ref(false);
const showPassword = ref(false);

// Use the update mutation
const updateMutation = useUpdateSecret();

const formData = reactive({
  name: props.secret.name,
  description: props.secret.description || "",
  value: "", // Don't pre-fill the value for security
  is_active: props.secret.is_active,
});

// Watch for changes to the secret prop
watch(
  () => props.secret,
  (newSecret) => {
    formData.name = newSecret.name;
    formData.description = newSecret.description || "";
    formData.is_active = newSecret.is_active;
    // Don't update the value field for security
  },
  { deep: true },
);

const nameRules = [
  (v: string) => !!v || t(strings.nameRequired),
  (v: string) => (v && v.length >= 3) || t(strings.nameMinLength),
];

const descriptionRules = [
  (v: string) => !v || v.length <= 500 || t(strings.descriptionMaxLength),
];

const valueRules = [
  (v: string) => !v || v.length >= 8 || t(strings.valueMinLength),
];

const onSubmit = async () => {
  if (form.value?.validate()) {
    try {
      const updateData: SecretUpdateRequest = {
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
      };

      // Only include value if it's been changed
      if (formData.value) {
        updateData.value = formData.value;
      }

      const result = await updateMutation.mutateAsync({
        id: props.secret.id,
        ...updateData,
      });
      emit("success", result);
    } catch (error) {
      // Error is handled by the mutation's error state
      console.error("Failed to update secret:", error);
    }
  }
};

const onCancel = () => {
  emit("cancel");
};

const getErrorMessage = (error: any) => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return getTanstackErrorMessage(error);
};
</script>
