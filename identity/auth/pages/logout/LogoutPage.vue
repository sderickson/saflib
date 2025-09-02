<script setup lang="ts">
import { onMounted } from "vue";
import { useLogout } from "../../requests/auth.ts";
import { logout_page } from "./LogoutPage.strings.ts";
import { useReverseT } from "../../i18n.ts";

const { t } = useReverseT();

const props = defineProps<{
  redirectTo?: string;
}>();

const emit = defineEmits(["logout"]);
const { mutate: logout } = useLogout();

onMounted(() => {
  logout(undefined, {
    onSuccess: async () => {
      emit("logout");
      if (props.redirectTo) {
        window.location.href = props.redirectTo;
      }
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
    <div class="text-h6">{{ t(logout_page.logging_out) }}</div>
  </div>
</template>
