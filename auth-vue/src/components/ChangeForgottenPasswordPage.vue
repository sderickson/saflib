<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useResetPassword } from "../requests/auth";

const route = useRoute();
const router = useRouter();
const token = route.query.token as string;

const temporaryPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const valid = ref(null);
const successMessage = ref("");
const errorMessage = ref("");

const { mutate: resetPassword, isPending } = useResetPassword();

const passwordRules = [
  (v: string) => !!v || "Password is required",
  (v: string) => v.length >= 8 || "Password must be at least 8 characters",
  // (v: string) =>
  //   /[A-Z]/.test(v) || "Password must contain at least one uppercase letter",
  // (v: string) =>
  //   /[a-z]/.test(v) || "Password must contain at least one lowercase letter",
  // (v: string) => /[0-9]/.test(v) || "Password must contain at least one number",
];

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
    successMessage.value =
      "Password successfully reset! Redirecting to login...";
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  } catch (error) {
    errorMessage.value = "Failed to reset password. Please try again.";
  }
};
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-card class="mx-auto pa-12 pb-8" elevation="8" width="448" rounded="lg">
      <v-form v-model="valid">
        <div class="text-subtitle-1 text-medium-emphasis">Reset Password</div>

        <div class="text-body-2 text-medium-emphasis mb-4">
          Please enter your temporary password and set a new password.
        </div>

        <v-text-field
          v-model="temporaryPassword"
          density="compact"
          placeholder="Temporary Password"
          prepend-inner-icon="mdi-key-outline"
          variant="outlined"
          type="password"
          :rules="[(v) => !!v || 'Temporary password is required']"
          :disabled="isPending"
        ></v-text-field>

        <v-text-field
          v-model="newPassword"
          density="compact"
          placeholder="New Password"
          prepend-inner-icon="mdi-lock-outline"
          variant="outlined"
          type="password"
          :rules="passwordRules"
          :disabled="isPending"
        ></v-text-field>

        <v-text-field
          v-model="confirmPassword"
          density="compact"
          placeholder="Confirm New Password"
          prepend-inner-icon="mdi-lock-check-outline"
          variant="outlined"
          type="password"
          :rules="[
            (v) => !!v || 'Please confirm your password',
            (_) => passwordsMatch || 'Passwords do not match',
          ]"
          :disabled="isPending"
        ></v-text-field>

        <v-alert
          v-if="successMessage"
          type="success"
          variant="tonal"
          class="mb-4"
        >
          {{ successMessage }}
        </v-alert>

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <v-btn
          class="my-5"
          color="blue"
          size="large"
          variant="tonal"
          block
          :disabled="!valid || !passwordsMatch || isPending"
          :loading="isPending"
          @click="handleSubmit"
        >
          {{ isPending ? "Resetting..." : "Reset Password" }}
        </v-btn>

        <v-card-text class="text-center">
          <router-link
            class="text-blue text-decoration-none"
            to="/login"
            :class="{ 'pointer-events-none': isPending }"
          >
            Back to Login <v-icon icon="mdi-chevron-right"></v-icon>
          </router-link>
        </v-card-text>
      </v-form>
    </v-card>
  </div>
</template>

<style scoped>
.pointer-events-none {
  pointer-events: none;
  opacity: 0.7;
}
</style>
