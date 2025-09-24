<template>
  <v-container>
    <h1>{{ t(strings.title) }}</h1>
    <p>{{ t(strings.description) }}</p>

    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="secrets">{{ t(strings.secretsTab) }}</v-tab>
      <v-tab value="access-requests">{{ t(strings.accessRequestsTab) }}</v-tab>
      <v-tab value="service-tokens">{{ t(strings.serviceTokensTab) }}</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="secrets">
        <div>
          <h3>{{ t(strings.secretsTitle) }}</h3>
          <i18n-t :keypath="lookupTKey(strings.secretsCount)" scope="global">
            <template #count>{{ secrets.length }}</template>
          </i18n-t>
          <pre>{{ JSON.stringify(secrets, null, 2) }}</pre>
        </div>
      </v-window-item>

      <v-window-item value="access-requests">
        <div>
          <h3>{{ t(strings.accessRequestsTitle) }}</h3>
          <i18n-t
            :keypath="lookupTKey(strings.accessRequestsCount)"
            scope="global"
          >
            <template #count>{{ accessRequests.length }}</template>
          </i18n-t>
          <pre>{{ JSON.stringify(accessRequests, null, 2) }}</pre>
        </div>
      </v-window-item>

      <v-window-item value="service-tokens">
        <div>
          <h3>{{ t(strings.serviceTokensTitle) }}</h3>
          <i18n-t
            :keypath="lookupTKey(strings.serviceTokensCount)"
            scope="global"
          >
            <template #count>{{ serviceTokens.length }}</template>
          </i18n-t>
          <pre>{{ JSON.stringify(serviceTokens, null, 2) }}</pre>
        </div>
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup lang="ts">
import { secret_manager_page as strings } from "./SecretManager.strings";
import { useSecretManagerLoader } from "./SecretManager.loader";
import { useReverseT } from "../../i18n.ts";
import { ref } from "vue";

const { t, lookupTKey } = useReverseT();

const { secretsQuery, accessRequestsQuery, serviceTokensQuery } =
  useSecretManagerLoader();

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
if (!secretsQuery.data.value) {
  throw new Error("Failed to load secrets");
}
if (!accessRequestsQuery.data.value) {
  throw new Error("Failed to load access requests");
}
if (!serviceTokensQuery.data.value) {
  throw new Error("Failed to load service tokens");
}

const secrets = secretsQuery.data.value;
const accessRequests = accessRequestsQuery.data.value;
const serviceTokens = serviceTokensQuery.data.value;

const activeTab = ref("secrets");
</script>
