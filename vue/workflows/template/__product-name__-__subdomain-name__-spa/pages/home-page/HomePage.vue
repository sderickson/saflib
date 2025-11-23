<template>
  <v-container>
    <h1>{{ t(strings.example_header) }}</h1>
    <v-text-field v-bind="t(strings.example_input)"></v-text-field>
    <i18n-t
      v-if="profile.id"
      :keypath="lookupTKey(strings.logged_in_with_email)"
    >
      <template #email>{{ profile.email }}</template>
    </i18n-t>
    <div v-else>{{ t(strings.not_logged_in) }}</div>
  </v-container>
</template>

<script setup lang="ts">
import { useReverseT } from "../../i18n.ts";
import { home_page as strings } from "./HomePage.strings.ts";
import { useHomePageLoader } from "./HomePage.loader.ts";

const { t, lookupTKey } = useReverseT();

const { profileQuery } = useHomePageLoader();

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
if (!profileQuery.data.value) {
  throw new Error("Failed to load profile");
}

const profile = profileQuery.data.value;
</script>
