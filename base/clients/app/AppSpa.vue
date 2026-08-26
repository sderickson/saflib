<script setup lang="ts">
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
</script>

<template>
  <DynamicBaseLayout require-auth>
    <router-view />
  </DynamicBaseLayout>
</template>
