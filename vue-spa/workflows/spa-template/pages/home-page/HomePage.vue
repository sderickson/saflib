<template>
  <v-container>
    <h1>{{ t(strings.example_header) }}</h1>
    <v-text-field v-bind="strings.example_input"></v-text-field>
    <div v-if="profile.id">Logged in with {{ profile.email }}</div>
    <div v-else>Not logged in</div>
  </v-container>
</template>

<script setup lang="ts">
import { useReverseT } from "../../i18n.ts";
import { home_page as strings } from "./HomePage.strings";
import { useHomePageLoader } from "./HomePage.loader";

const { t } = useReverseT();

const { profileQuery } = useHomePageLoader();

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
if (!profileQuery.data.value) {
  throw new Error("Failed to load profile");
}

const profile = profileQuery.data.value;
</script>
