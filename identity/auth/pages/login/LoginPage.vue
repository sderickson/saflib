<template>
  <v-form v-model="valid" validate-on="blur">
    <div class="float-right">
      <SpaLink
        :link="authLinks.register"
        class="text-blue text-decoration-none"
      >
        {{ t(login_page.sign_up_now) }}
        <v-icon icon="mdi-chevron-right"></v-icon>
      </SpaLink>
    </div>

    <div class="mb-4 font-weight-medium">
      {{ t(login_page.log_into_your_account) }}
    </div>

    <v-text-field
      v-model="email"
      v-bind="t(login_page.email)"
      prepend-inner-icon="mdi-email-outline"
      :rules="emailRules"
      :disabled="isPending"
      class="mb-4 float-clear"
      autofocus
    />

    <div
      class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between"
    >
      <SpaLink
        :link="authLinks.forgot"
        class="text-caption text-decoration-none text-blue"
      >
        {{ t(login_page.forgot_password) }}
      </SpaLink>
    </div>

    <v-text-field
      v-model="password"
      :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      :type="passwordVisible ? 'text' : 'password'"
      v-bind="t(login_page.password)"
      prepend-inner-icon="mdi-lock-outline"
      :rules="passwordRules"
      :disabled="isPending"
      class="mb-4"
      @click:append-inner="passwordVisible = !passwordVisible"
    />

    <v-alert v-if="isError" type="error" variant="tonal" class="mb-3">
      {{ t(login_page.invalid_credentials) }}
    </v-alert>

    <v-btn
      block
      class="mb-8"
      color="primary"
      size="large"
      variant="tonal"
      :loading="isPending"
      :disabled="!valid"
      @click="handleLogin"
    >
      {{ t(login_page.log_in) }}
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { emailRules, passwordRules } from "../../utils/rules.ts";
import { useLogin } from "../../requests/auth.ts";
import { login_page } from "./LoginPage.strings.ts";
import { authLinks } from "@saflib/auth-links";
import { SpaLink } from "@saflib/vue/components";
import type { User } from "@saflib/identity-spec";
import { useReverseT } from "../../i18n.ts";

const { t } = useReverseT();

const emit = defineEmits<{
  (e: "login", user: User): void;
}>();

const props = defineProps<{
  redirectTo?: string;
}>();

const { mutateAsync: login, isError, data: user, isPending } = useLogin();

const email = ref("");
const password = ref("");
const valid = ref(false);
const passwordVisible = ref(false);

const handleLogin = async () => {
  if (!valid.value) return;

  try {
    await login({ email: email.value, password: password.value });
    if (user.value) {
      emit("login", user.value);
      if (props.redirectTo) {
        window.location.href = props.redirectTo;
      }
    }
  } catch (error) {}
};
</script>
