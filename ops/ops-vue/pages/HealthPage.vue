<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.health_page_title }}</AdminPageTitle>
    <AdminPanel data-test="diagnostics-health">
      <template #title>
        <h2>{{ strings.health_title }}</h2>
      </template>
      <template #actions>
        <v-btn variant="text" size="small" prepend-icon="mdi-refresh" :loading="health.isFetching.value" @click="health.refetch()">
          {{ strings.health_recheck }}
        </v-btn>
      </template>
      <v-progress-linear v-if="health.isPending.value" indeterminate />
      <v-table v-else-if="health.data.value">
        <thead>
          <tr>
            <th style="width: 40px" aria-hidden="true" />
            <th>{{ strings.health_cols.check }}</th>
            <th>{{ strings.health_cols.reading }}</th>
            <th class="text-right">{{ strings.health_cols.took }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in health.data.value.health.checks" :key="c.name" :data-test="`health-${c.name}`">
            <td><StatusIcon :tone="c.status" /></td>
            <td><code>{{ c.name }}</code></td>
            <td>{{ c.summary }}</td>
            <td class="text-right text-medium-emphasis">{{ c.duration_ms != null ? `${Math.round(c.duration_ms)} ms` : "" }}</td>
          </tr>
        </tbody>
      </v-table>
    </AdminPanel>

  </ContentWidth>
</template>

<script setup lang="ts">
import { AdminPageTitle, AdminPanel, ContentWidth } from "@saflib/vue/components";
import { useOpsHealth } from "../requests/queries.ts";
import StatusIcon from "../components/StatusIcon.vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

const health = useOpsHealth();
</script>
