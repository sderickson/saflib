<template>
  <v-app>
    <v-main>
      Test!
      <MissingSecretsTable :missingSecrets="[]" />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
console.log("App.vue");
import MissingSecretsTable from "./displays/missing-secrets-table/MissingSecretsTable.vue";
// import { router } from "./router.ts";
</script>
