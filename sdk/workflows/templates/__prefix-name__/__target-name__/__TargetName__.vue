<template>
  <v-card>
    <v-card-title>
      <h2>{{ t(strings.title) }}</h2>
    </v-card-title>

    <v-card-subtitle>
      {{ t(strings.description) }}
    </v-card-subtitle>

    <v-card-text>
      <!-- Loading skeleton -->
      <div v-if="loading" class="mb-4">
        <v-skeleton-loader
          type="table-heading, table-thead, table-tbody, table-tbody, table-tbody"
          class="elevation-1"
        ></v-skeleton-loader>
      </div>

      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
        {{ getTanstackErrorMessage(error) }}
      </v-alert>

      <v-alert
        v-else-if="items.length === 0"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        {{ t(strings.empty) }}
      </v-alert>

      <!-- TODO: Implement the main component content here -->
      <!-- TODO: Use props that match the schemas exported by the adjacent "spec" package -->
      <!-- TODO: Add any strings to the strings.ts file, not directly in the component -->
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { __target_name___strings as strings } from "./__TargetName__.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { TanstackError, getTanstackErrorMessage } from "@saflib/sdk";
// @ts-expect-error - TODO: replace with the actual schema, use with defineModel and defineProps
import { type TODO } from "template-package-spec";

const { t } = useReverseT();

defineProps<{
  items: TODO[]; // TODO: Replace with actual data type from spec package. Do not load data in this component! Data fetching is handled separately.
  loading?: boolean;
  error?: TanstackError;
}>();

// If this is a form, also use defineModel

// TODO: Add emits for component actions
// const emit = defineEmits<{
//   // Add emit events here based on component functionality, for things such as navigations or successful form submissions
// }>();

// TODO: Add component-specific functions here
// TODO: Add mutations (not queries!) here if they are needed for the component
</script>
