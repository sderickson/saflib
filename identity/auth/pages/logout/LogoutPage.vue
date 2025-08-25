<script setup lang="ts">
import { onMounted } from "vue";
import { useLogout } from "../../requests/auth.ts";
import { logout_page } from "./LogoutPage.strings.ts";

const emit = defineEmits(["logout"]);
const { mutate: logout } = useLogout();

onMounted(() => {
  logout(undefined, {
    onSuccess: async () => {
      emit("logout");
    },
  });
});
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-progress-circular
      indeterminate
      size="64"
      color="primary"
      class="mt-16 mb-4"
    />
    <div class="text-h6">{{ logout_page.logging_out }}</div>
  </div>
</template>
