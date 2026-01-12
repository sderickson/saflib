<template>
  <v-container>
    <h1>{{ t(strings.title) }}</h1>
    <v-text-field v-bind="t(strings.example_input)"></v-text-field>
    <i18n-t
      v-if="profile.id"
      scope="global"
      :keypath="lookupTKey(strings.logged_in_with_email)"
    >
      <template #email>{{ profile.email }}</template>
    </i18n-t>
    <div v-else>{{ t(strings.not_logged_in) }}</div>
  </v-container>
</template>

<script setup lang="ts">
import { __target_name___page as strings } from "./__TargetName__Page.strings.ts";
import { use__TargetName__Loader } from "./__TargetName__Page.loader.ts";
import { useReverseT } from "~/i18n.ts";

const { t, lookupTKey } = useReverseT();

const { profileQuery } = use__TargetName__Loader();

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
if (!profileQuery.data.value) {
  throw new Error("Failed to load profile");
}

const profile = profileQuery.data.value;
</script>
