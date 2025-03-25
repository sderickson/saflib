<script setup lang="ts">
import { ref } from "vue";
import { emailRules } from "../rules";

const email = ref("");
const valid = ref(null);

const sendResetLink = () => {
  console.log("send reset link", email.value, { valid: valid.value });
};
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-card class="mx-auto pa-12 pb-8" elevation="8" width="448" rounded="lg">
      <v-form v-model="valid">
        <div class="text-subtitle-1 text-medium-emphasis">Reset Password</div>

        <div class="text-body-2 text-medium-emphasis mb-4">
          Enter your email address and we'll send you a link to reset your
          password.
        </div>

        <v-text-field
          v-model="email"
          density="compact"
          placeholder="Email address"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
          :rules="emailRules"
          autofocus
        ></v-text-field>

        <v-btn
          class="my-5"
          color="blue"
          size="large"
          variant="tonal"
          block
          :disabled="!valid"
          @click="sendResetLink"
        >
          Send Reset Link
        </v-btn>

        <v-card-text class="text-center">
          <router-link class="text-blue text-decoration-none" to="/login">
            Back to Login <v-icon icon="mdi-chevron-right"></v-icon>
          </router-link>
        </v-card-text>
      </v-form>
    </v-card>
  </div>
</template>

<style scoped></style>
