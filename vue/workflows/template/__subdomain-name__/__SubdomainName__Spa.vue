<script setup lang="ts">
import { computed } from "vue";
import { Dynamic__ProductName__Layout } from "template-package-clients-common";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
const { data: session } = useKratosSession();
const loggedIn = computed(() => !!session);
</script>

<template>
  <Dynamic__ProductName__Layout :logged-in="loggedIn">
    <router-view />
  </Dynamic__ProductName__Layout>
</template>
