<template>
  <v-app>
    <v-main>
      <MissingSecretsTable :missingSecrets="accessRequestStubs" />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import MissingSecretsTable from "./displays/missing-secrets-table/MissingSecretsTable.vue";
import { accessRequestStubs } from "./requests/access-requests/list.fake.ts";
// import { router } from "./router.ts";
</script>
