<template>
  <ContentWidth variant="full" class="analytics-events-page">
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <h1 class="text-h4 mb-0">Product Events</h1>
          <v-chip size="small" variant="tonal">
            {{ filteredEvents.length }} / {{ productEvents.length }}
          </v-chip>
          <v-btn
            size="small"
            variant="tonal"
            :loading="isLoading"
            @click="refetch()"
          >
            Refresh
          </v-btn>
        </div>

        <v-alert v-if="error" type="error" class="mb-4">
          Error loading events: {{ error.message }}
        </v-alert>

        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-text-field
            v-model="nameFilter"
            label="Filter by event name"
            type="search"
            density="compact"
            hide-details
            clearable
            style="min-width: 200px; max-width: 280px"
          />
        </div>

        <v-table density="compact" class="events-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Source</th>
              <th>Timestamp</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in filteredEvents" :key="entry.id">
              <td>{{ entry.id }}</td>
              <td>{{ entry.name }}</td>
              <td>
                <v-chip size="x-small" variant="tonal">
                  {{ entry.source }}
                </v-chip>
              </td>
              <td>{{ entry.timestamp }}</td>
              <td>
                <pre class="payload-json">{{ formatPayload(entry.payload) }}</pre>
              </td>
            </tr>
          </tbody>
        </v-table>

        <p v-if="filteredEvents.length === 0" class="events-empty">
          No product events recorded yet.
        </p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { useListProductEvents } from "@saflib/analytics-sdk";


const nameFilter = ref("");

const {
  data,
  error,
  isLoading,
  refetch,
} = useListProductEvents();

const productEvents = computed(() => data.value?.productEvents ?? []);

const filteredEvents = computed(() => {
  const query = nameFilter.value.trim().toLowerCase();
  if (!query) return productEvents.value;
  return productEvents.value.filter((entry) =>
    entry.name.toLowerCase().includes(query),
  );
});

function formatPayload(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}
</script>

<style scoped>
.analytics-events-page {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.events-table {
  background: rgb(var(--v-theme-surface));
}

.payload-json {
  margin: 0;
  max-width: 48rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 11px;
  line-height: 1.35;
}

.events-empty {
  padding: 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
