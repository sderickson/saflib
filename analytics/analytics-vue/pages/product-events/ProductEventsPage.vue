<template>
  <ContentWidth variant="full" class="product-events-page">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h1 class="text-h4 mb-0">{{ strings.title }}</h1>
      <v-chip size="small" variant="tonal">
        {{ filteredEvents.length }} / {{ productEvents.length }}
      </v-chip>
      <v-btn
        size="small"
        variant="tonal"
        :loading="productEventsQuery.isFetching.value"
        @click="productEventsQuery.refetch()"
      >
        {{ strings.refresh }}
      </v-btn>
    </div>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-text-field
        v-model="nameFilter"
        :label="strings.filter_label"
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
          <th>{{ strings.columns.id }}</th>
          <th>{{ strings.columns.name }}</th>
          <th>{{ strings.columns.source }}</th>
          <th>{{ strings.columns.timestamp }}</th>
          <th>{{ strings.columns.payload }}</th>
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
      {{ strings.empty }}
    </p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { product_events as strings } from "./ProductEvents.strings.ts";
import { useProductEventsPageLoader } from "./ProductEvents.loader.ts";

const { productEventsQuery } = useProductEventsPageLoader();
const nameFilter = ref("");

const productEvents = computed(
  () => productEventsQuery.data.value?.productEvents ?? [],
);

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
.product-events-page {
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
