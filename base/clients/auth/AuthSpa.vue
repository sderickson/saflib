<script setup lang="ts">
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
import { ContentWidth } from "@saflib/vue/components";
import { configureAuthApp } from "@saflib/ory-kratos-spa";

configureAuthApp();
</script>

<template>
  <DynamicBaseLayout>
    <ContentWidth variant="narrow" class="auth-spa-container py-8 py-md-12">
      <router-view />
    </ContentWidth>
  </DynamicBaseLayout>
</template>

<style scoped>
.auth-spa-container {
  min-height: calc(100vh - 90px);
}
</style>
