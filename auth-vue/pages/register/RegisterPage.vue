<template>
  <v-form v-model="valid">
    <div class="float-right">
      <router-link class="text-blue text-decoration-none" to="/login">
        {{ register_page.already_have_account }}
        <v-icon icon="mdi-chevron-right"></v-icon>
      </router-link>
    </div>

    <div class="mb-4 font-weight-medium">
      {{ register_page.create_your_account }}
    </div>
    <div v-if="firstNameInput">
      <v-text-field
        v-model="firstName"
        v-bind="register_page.first_name"
        prepend-inner-icon="mdi-account-outline"
        class="mb-4"
        :autofocus="firstInput === 'firstName'"
      ></v-text-field>
    </div>

    <div v-if="lastNameInput">
      <v-text-field
        v-model="lastName"
        v-bind="register_page.last_name"
        prepend-inner-icon="mdi-account-outline"
        class="mb-4"
        :autofocus="firstInput === 'lastName'"
      ></v-text-field>
    </div>

    <div v-if="nameInput">
      <v-text-field
        v-model="name"
        v-bind="register_page.name"
        prepend-inner-icon="mdi-account-outline"
        class="mb-4"
        :autofocus="firstInput === 'name'"
      ></v-text-field>
    </div>

    <v-text-field
      v-model="email"
      v-bind="register_page.email"
      prepend-inner-icon="mdi-email-outline"
      :rules="emailRules"
      class="mb-4"
      :autofocus="firstInput === 'email'"
    ></v-text-field>

    <v-text-field
      v-model="password"
      :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      :type="passwordVisible ? 'text' : 'password'"
      :rules="passwordRules"
      class="mb-4"
      v-bind="register_page.password"
      prepend-inner-icon="mdi-lock-outline"
      @click:append-inner="passwordVisible = !passwordVisible"
    ></v-text-field>

    <v-text-field
      v-model="confirmPassword"
      :type="passwordVisible ? 'text' : 'password'"
      :rules="confirmPasswordRules"
      v-bind="register_page.confirm_password"
      prepend-inner-icon="mdi-lock-outline"
      class="mb-4"
    ></v-text-field>
    <v-btn
      class="my-5"
      color="primary"
      size="large"
      variant="tonal"
      block
      :disabled="!valid || isPending"
      :loading="isPending"
      @click="handleRegister"
    >
      {{ ctaText || register_page.register }}
    </v-btn>

    <v-alert v-if="isError" type="error" variant="outlined" class="mb-3">
      {{
        error?.status === 409
          ? register_page.email_already_exists
          : register_page.failed_to_register
      }}
    </v-alert>
  </v-form>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { emailRules, passwordRules } from "../../utils/rules.ts";
import { useRegister } from "../../requests/auth.ts";
import { register_page } from "./RegisterPage.strings.ts";

const props = defineProps<{
  firstNameInput?: boolean;
  lastNameInput?: boolean;
  nameInput?: boolean;
  ctaText?: string;
}>();

const emit = defineEmits(["signup"]);

const firstName = ref("");
const lastName = ref("");
const name = ref("");
const passwordVisible = ref(false);
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const valid = ref(null);

const {
  mutate: register,
  isPending,
  isError,
  error,
  isSuccess,
} = useRegister();

const firstInput = computed(() => {
  if (props.firstNameInput) {
    return "firstName";
  }
  if (props.lastNameInput) {
    return "lastName";
  }
  if (props.nameInput) {
    return "name";
  }
  return "email";
});

watch(
  () => isSuccess.value,
  async (success) => {
    if (success) {
      emit("signup");
    }
  },
);

const handleRegister = () => {
  register({
    email: email.value,
    password: password.value,
    givenName: firstName.value,
    familyName: lastName.value,
    name: name.value,
  });
};

const confirmPasswordRules = [
  (value: string) => !!value || register_page.please_confirm_password,
  (value: string) =>
    value === password.value || register_page.passwords_must_match,
];
</script>
