<template>
  <div>
    <ProfileIntro />
    <ProfileForm :initial-values="formValues" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useProfileLoader } from "./Profile.loader.ts";
import { profileFormValuesFromUserConfig } from "./Profile.logic.ts";
import ProfileIntro from "./ProfileIntro.vue";
import ProfileForm from "./ProfileForm.vue";

const { userConfigQuery } = useProfileLoader();

if (!userConfigQuery.data.value?.user_config) {
  throw new Error("Failed to load user config");
}

const formValues = computed(() =>
  profileFormValuesFromUserConfig(userConfigQuery.data.value!.user_config),
);
</script>
