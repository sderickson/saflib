<script setup lang="ts">
import { computed } from "vue";
import { DynamicTemplatesLayout } from "@saflib/templates-clients-common/components";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
import { configureAuthApp } from "@saflib/ory-kratos-spa";

configureAuthApp();

const { data: session } = useKratosSession();
const loggedIn = computed(() => !!session);
</script>

<template>
  <DynamicTemplatesLayout :logged-in="loggedIn">
    <v-container class="auth-spa-container py-6">
      <v-row justify="center">
        <v-col cols="12" sm="10" md="7" lg="5" xl="4">
          <router-view />
        </v-col>
      </v-row>
    </v-container>
  </DynamicTemplatesLayout>
</template>
