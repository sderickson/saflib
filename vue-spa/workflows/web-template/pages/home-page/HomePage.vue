<template>
  <v-container>
    <h1>{{ strings.example_header }}</h1>
    <v-text-field v-bind="strings.example_input"></v-text-field>
  </v-container>
</template>

<script setup lang="ts">
import { home_page as strings } from "./HomePage.strings";
</script>
