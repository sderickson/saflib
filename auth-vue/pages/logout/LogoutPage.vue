<script setup lang="ts">
import { onMounted } from "vue";
import { useLogout } from "../../requests/auth.ts";

const { mutate: logout } = useLogout();

onMounted(() => {
  logout(undefined, {
    onSuccess: async () => {
      window.location.href = "/";
    },
  });
});
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-progress-circular indeterminate size="64" color="primary" class="mb-4" />
    <div class="text-h6">Logging out...</div>
  </div>
</template>
