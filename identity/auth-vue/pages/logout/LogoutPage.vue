<script setup lang="ts">
import { onMounted } from "vue";
import { useLogout } from "../../requests/auth.ts";

const props = defineProps<{
  redirectTo?: string;
}>();

const { mutate: logout } = useLogout();

onMounted(() => {
  logout(undefined, {
    onSuccess: async () => {
      window.location.href = props.redirectTo || "/";
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
