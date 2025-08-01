<template>
  <v-form v-model="valid">
    <div class="mb-4 float-right">
      <SpaLink :link="authLinks.login" class="text-blue text-decoration-none">
        {{ forgot_password_page.back_to_login }}
        <v-icon icon="mdi-chevron-right"></v-icon>
      </SpaLink>
    </div>
    <div class="mb-4 font-weight-medium">
      {{ forgot_password_page.forgot_password }}
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      {{ forgot_password_page.forgot_password_description }}
    </div>

    <v-text-field
      v-model="email"
      prepend-inner-icon="mdi-email-outline"
      v-bind="forgot_password_page.email_address"
      :rules="emailRules"
      :disabled="isPending"
      autofocus
      class="mb-4"
    ></v-text-field>

    <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-4">
      {{ successMessage }}
    </v-alert>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <v-btn
      class="my-5"
      color="primary"
      size="large"
      variant="tonal"
      block
      :disabled="!valid || isPending"
      :loading="isPending"
      @click="sendResetLink"
    >
      {{ isPending ? "Sending..." : "Send Reset Link" }}
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { emailRules } from "../../utils/rules";
import { useForgotPassword } from "../../requests/auth";
import { forgot_password_page } from "./ForgotPasswordPage.strings";
import { SpaLink } from "@saflib/vue-spa";
import { authLinks } from "@saflib/identity-links";

const email = ref("");
const valid = ref(null);
const successMessage = ref("");
const errorMessage = ref("");

const { mutateAsync: forgotPassword, isPending } = useForgotPassword();

const sendResetLink = async () => {
  if (!valid.value) return;

  successMessage.value = "";
  errorMessage.value = "";

  try {
    await forgotPassword({ email: email.value });
    successMessage.value = forgot_password_page.email_address_success;
  } catch (error) {
    errorMessage.value = forgot_password_page.email_address_network_error;
  }
};
</script>

<style scoped>
.pointer-events-none {
  pointer-events: none;
  opacity: 0.7;
}
</style>
