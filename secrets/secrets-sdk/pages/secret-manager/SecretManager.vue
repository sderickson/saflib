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
        <div class="mb-4">
          <SecretsTable
            :secrets="secrets"
            :loading="secretsQuery.isLoading.value"
            :error="secretsQuery.error.value"
          />
        </div>
        <div>
          <MissingSecretsTable
            :missing-secrets="accessRequests"
            :loading="accessRequestsQuery.isLoading.value"
            :error="accessRequestsQuery.error.value"
            @create-secret="onCreateSecret"
            @view-details="onViewDetails"
          />
        </div>
      </v-window-item>

      <v-window-item value="access-requests">
        <AccessRequestTable
          :access-request="accessRequests[0]"
          v-if="accessRequests.length > 0"
        />
        <v-alert v-else type="info" variant="tonal">
          {{ t(strings.noAccessRequests) }}
        </v-alert>
      </v-window-item>

      <v-window-item value="service-tokens">
        <ServiceTokensTable
          :service-tokens="serviceTokens"
          :loading="serviceTokensQuery.isLoading.value"
          :error="serviceTokensQuery.error.value"
          @approve="onApproveToken"
          @delete="onDeleteToken"
        />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup lang="ts">
import { secret_manager_page as strings } from "./SecretManager.strings";
import { useSecretManagerLoader } from "./SecretManager.loader";
import { useReverseT } from "../../i18n.ts";
import { ref } from "vue";
import SecretsTable from "../../displays/secrets-table/SecretsTable.vue";
import MissingSecretsTable from "../../displays/missing-secrets-table/MissingSecretsTable.vue";
import AccessRequestTable from "../../displays/access-request-table/AccessRequestTable.vue";
import ServiceTokensTable from "../../displays/service-tokens-table/ServiceTokensTable.vue";

const { t } = useReverseT();

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

// Event handlers
const onCreateSecret = (request: any) => {
  console.log("Create secret for request:", request);
  // TODO: Implement secret creation logic
};

const onViewDetails = (request: any) => {
  console.log("View details for request:", request);
  // TODO: Implement view details logic
};

const onApproveToken = (token: any) => {
  console.log("Approve token:", token);
  // TODO: Implement token approval logic
};

const onDeleteToken = (token: any) => {
  console.log("Delete token:", token);
  // TODO: Implement token deletion logic
};
</script>
