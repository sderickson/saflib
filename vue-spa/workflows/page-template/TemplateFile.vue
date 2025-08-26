<template>
  <v-container>
    <h1>{{ t(strings.title) }}</h1>
    <v-text-field v-bind="strings.example_input"></v-text-field>
    <div v-if="profile.id">Logged in with {{ profile.email }}</div>
    <div v-else>Not logged in</div>
  </v-container>
</template>

<script setup lang="ts">
import { template_file_page as strings } from "./TemplateFile.strings";
import { useTemplateFileLoader } from "./TemplateFile.loader";
import { useReverseT } from "../spa-template/i18n.ts";

const { t } = useReverseT();

const { profileQuery } = useTemplateFileLoader();

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
if (!profileQuery.data.value) {
  throw new Error("Failed to load profile");
}

const profile = profileQuery.data.value;
</script>
