<template>
  <v-container>
    <h1>{{ t(strings.title) }}</h1>
    <v-text-field v-bind="strings.example_input"></v-text-field>
    <div>loaded {{ usersQuery.data.value?.length }} users</div>
  </v-container>
</template>

<script setup lang="ts">
// @ts-nocheck
import { TemplateFile_page as strings } from "./TemplateFile.strings.ts";
import { useTemplateFileLoader } from "./TemplateFile.loader";
import { useReverseT } from "../../i18n.ts";

const { t } = useReverseT();

// TODO: update this with data that was actually loaded
// TODO: render the data raw in the template to confirm loading succeeds
const { usersQuery } = useTemplateFileLoader();

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
if (!usersQuery.data.value) {
  throw new Error("Failed to load users");
}
</script>
