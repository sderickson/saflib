<script setup lang="ts">
/**
 * Demo home for the literal template SPA at __subdomain-name__.docker.localhost.
 * Replaced/extended via vue/add-view when this package is the add-spa source.
 */
</script>

<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <h1 class="text-h4 mb-4">__SubdomainName__ template SPA</h1>
        <p class="text-body-1 mb-2">
          This is the co-located Vue SPA template inside
          <code>base/clients/__subdomain-name__</code>.
        </p>
        <p class="text-body-2 text-medium-emphasis">
          Host:
          <code>__subdomain-name__.docker.localhost</code>
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>
