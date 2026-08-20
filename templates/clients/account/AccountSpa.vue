<script setup lang="ts">
import { computed } from "vue";
import { DynamicTemplatesLayout } from "@saflib/templates-clients-common/components";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
const { data: session } = useKratosSession();
const loggedIn = computed(() => !!session);
</script>

<template>
  <DynamicTemplatesLayout :logged-in="loggedIn">
    <router-view />
  </DynamicTemplatesLayout>
</template>
