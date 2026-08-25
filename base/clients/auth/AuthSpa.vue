<script setup lang="ts">
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
import { configureAuthApp } from "@saflib/ory-kratos-spa";

configureAuthApp();
</script>

<template>
  <DynamicBaseLayout>
    <v-container class="auth-spa-container py-8 py-md-12" fluid>
      <v-row justify="center" align="center">
        <v-col cols="12" sm="10" md="7" lg="5" xl="4">
          <router-view />
        </v-col>
      </v-row>
    </v-container>
  </DynamicBaseLayout>
</template>

<style scoped>
.auth-spa-container {
  min-height: calc(100vh - 90px);
}
</style>
