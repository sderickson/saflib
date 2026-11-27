<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.health_page_title }}</AdminPageTitle>
    <AdminPanel data-test="diagnostics-health">
      <template #title>
        <h2>{{ strings.health_title }}</h2>
      </template>
      <template #actions>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          :title="strings.health_recheck"
          :aria-label="strings.health_recheck"
          :loading="health.isFetching.value"
          @click="health.refetch()"
        />
      </template>
      <v-progress-linear v-if="health.isPending.value" indeterminate />
      <v-table v-else-if="health.data.value">
        <thead>
          <tr>
            <th style="width: 40px" aria-hidden="true" />
            <th>{{ strings.health_cols.check }}</th>
            <th>{{ strings.health_cols.reading }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in health.data.value.health.checks" :key="c.name" :data-test="`health-${c.name}`">
            <td><StatusIcon :tone="c.status" /></td>
            <td><code>{{ c.name }}</code></td>
            <td>{{ c.summary }}</td>
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
