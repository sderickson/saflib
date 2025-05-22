<template>
  <v-container>
    <h1>{{ strings.example_header }}</h1>
    <v-text-field v-bind="strings.example_input"></v-text-field>
    <div>loaded {{ usersQuery.data.value?.length }} users</div>
  </v-container>
</template>

<script setup lang="ts">
import { home_page as strings } from "./HomePage.strings";
import { useHomePageLoader } from "./HomePage.loader";

const { usersQuery } = useHomePageLoader();

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
if (!usersQuery.data.value) {
  throw new Error("Failed to load users");
}
</script>
