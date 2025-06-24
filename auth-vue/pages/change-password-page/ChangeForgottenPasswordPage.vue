<template>
  <div>
    <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-4">
      {{ successMessage }}
    </v-alert>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <v-form v-if="!successMessage" v-model="valid">
      <div class="mb-4 font-weight-medium">Reset Password</div>

      <div class="text-body-2 text-medium-emphasis mb-4">
        Please set a new password.
      </div>

      <v-text-field
        v-model="newPassword"
        v-bind="change_forgotten_password_page.new_password"
        prepend-inner-icon="mdi-lock-outline"
        type="password"
        :rules="passwordRules"
        :disabled="isPending"
      ></v-text-field>

      <v-text-field
        v-model="confirmPassword"
        v-bind="change_forgotten_password_page.confirm_password"
        prepend-inner-icon="mdi-lock-check-outline"
        type="password"
        :rules="[
          (v) =>
            !!v || change_forgotten_password_page.please_confirm_your_password,
          (_) =>
            passwordsMatch ||
            change_forgotten_password_page.passwords_do_not_match,
        ]"
        :disabled="isPending"
      ></v-text-field>

      <v-btn
        class="my-5"
        color="primary"
        size="large"
        variant="tonal"
        block
        :disabled="!valid || !passwordsMatch || isPending"
        :loading="isPending"
        @click="handleSubmit"
      >
        {{
          isPending
            ? change_forgotten_password_page.resetting
            : change_forgotten_password_page.reset_password
        }}
      </v-btn>
    </v-form>

    <v-card-text v-else class="text-center">
      <router-link class="text-blue text-decoration-none" to="/login">
        {{ change_forgotten_password_page.continue_to_login }}
        <v-icon icon="mdi-chevron-right"></v-icon>
      </router-link>
    </v-card-text>
  </div>
</template>

<style scoped>
.pointer-events-none {
  pointer-events: none;
  opacity: 0.7;
}
</style>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useResetPassword } from "../../src/requests/auth";
import { passwordRules } from "../../src/utils/rules";
import { change_forgotten_password_page } from "./ChangeForgottenPasswordPage.strings";

const route = useRoute();
const token = route.query.token as string;

const newPassword = ref("");
const confirmPassword = ref("");
const valid = ref<boolean | null>(null);
const successMessage = ref("");
const errorMessage = ref("");

const { mutateAsync: resetPassword, isPending } = useResetPassword();

const passwordsMatch = computed(
  () => newPassword.value === confirmPassword.value,
);

const handleSubmit = async () => {
  if (!valid.value || !passwordsMatch.value) return;

  successMessage.value = "";
  errorMessage.value = "";

  try {
    await resetPassword({
      token,
      newPassword: newPassword.value,
    });
    successMessage.value = "Password successfully reset!";
    // Hide the form by setting valid to false
    valid.value = false;
  } catch (error: any) {
    errorMessage.value = "Failed to reset password. Please try again.";
  }
};
</script>
