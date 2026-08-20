<script setup lang="ts">
import { computed } from "vue";
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
const { data: session } = useKratosSession();
const loggedIn = computed(() => !!session);
</script>

<template>
  <DynamicBaseLayout :logged-in="loggedIn">
    <router-view />
  </DynamicBaseLayout>
</template>
