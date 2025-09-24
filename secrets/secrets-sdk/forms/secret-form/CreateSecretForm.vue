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
      <div v-if="createMutation.isPending.value" class="mb-4">
        <v-skeleton-loader
          type="table-heading, table-thead, table-tbody, table-tbody, table-tbody"
          class="elevation-1"
        ></v-skeleton-loader>
      </div>

      <v-alert
        v-else-if="createMutation.error.value"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ getErrorMessage(createMutation.error.value) }}
      </v-alert>

      <v-form v-else ref="form" v-model="isValid" @submit.prevent="onSubmit">
        <v-text-field
          v-model="formData.name"
          :label="t(strings.nameLabel)"
          :rules="nameRules"
          :disabled="createMutation.isPending.value || !!props.secretName"
          required
          class="mb-4"
        ></v-text-field>

        <v-textarea
          v-model="formData.description"
          :label="t(strings.descriptionLabel)"
          :rules="descriptionRules"
          :disabled="createMutation.isPending.value"
          rows="3"
          class="mb-4"
        ></v-textarea>

        <v-text-field
          v-model="formData.value"
          :label="t(strings.valueLabel)"
          :rules="valueRules"
          :disabled="createMutation.isPending.value"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="showPassword = !showPassword"
          data-testid="password-toggle"
          required
          class="mb-4"
        ></v-text-field>

        <div class="d-flex gap-2">
          <v-btn
            type="submit"
            color="primary"
            :loading="createMutation.isPending.value"
            :disabled="!isValid"
          >
            {{ t(strings.submitButton) }}
          </v-btn>

          <v-btn
            type="button"
            variant="outlined"
            :disabled="createMutation.isPending.value"
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
import { secret_form_strings as strings } from "./CreateSecretForm.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { getTanstackErrorMessage } from "@saflib/sdk";
import { useCreateSecret } from "../../requests/secrets/create.ts";
import { ref, reactive } from "vue";

const { t } = useReverseT();

interface Props {
  secretName?: string; // Optional secret name to pre-fill and disable
}

const props = defineProps<Props>();

const emit = defineEmits<{
  success: [secret: any];
  cancel: [];
}>();

const form = ref();
const isValid = ref(false);
const showPassword = ref(false);

// Use the create mutation
const createMutation = useCreateSecret();

const formData = reactive({
  name: props.secretName || "",
  description: "",
  value: "",
});

const nameRules = [
  (v: string) => !!v || t(strings.nameRequired),
  (v: string) => (v && v.length >= 3) || t(strings.nameMinLength),
];

const descriptionRules = [
  (v: string) => !v || v.length <= 500 || t(strings.descriptionMaxLength),
];

const valueRules = [
  (v: string) => !!v || t(strings.valueRequired),
  (v: string) => (v && v.length >= 8) || t(strings.valueMinLength),
];

const onSubmit = async () => {
  if (form.value?.validate()) {
    try {
      const result = await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description,
        value: formData.value,
      });
      emit("success", result);
    } catch (error) {
      // Error is handled by the mutation's error state
      console.error("Failed to create secret:", error);
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
