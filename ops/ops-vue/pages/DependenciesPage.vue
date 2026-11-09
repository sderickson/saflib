<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-2">{{ strings.title }}</h1>
    <p class="text-body-2 mb-4">{{ strings.intro }}</p>

    <p v-if="!deps" class="text-body-1">{{ strings.none }}</p>
    <template v-else>
      <p class="text-body-2 text-medium-emphasis mb-4" data-test="deps-summary">
        {{ strings.checked }} {{ formatTime(deps.checked_at) }}
        <v-chip v-if="deps.stale" color="warning" size="x-small">{{ strings.stale }}</v-chip>
        · {{ deps.packages_total }} {{ strings.packages }} ({{ deps.direct_total }} {{ strings.direct }}) · Node {{ deps.node_version }}
      </p>
      <v-alert v-if="deps.errors.length" type="warning" variant="tonal" density="compact" class="mb-4">
        {{ strings.errors }}: {{ deps.errors.slice(0, 3).join("; ") }}
      </v-alert>

      <template v-if="deps.runtime.length">
        <h2 class="text-h6 mb-2">{{ strings.runtime }}</h2>
        <v-table density="compact" class="elevation-1 mb-6">
          <tbody>
            <tr v-for="c in deps.runtime" :key="c.name" data-test="runtime-row">
              <td><code>{{ c.name }} {{ c.version }}</code></td>
              <td class="text-no-wrap">
                {{ c.eol ? `${strings.eol} ${formatDate(c.eol)}` : strings.eolUnknown }}
                <v-chip v-if="c.eol_soon" color="warning" size="x-small" class="ml-1">{{ strings.eolSoon }}</v-chip>
              </td>
              <td class="text-caption text-medium-emphasis text-no-wrap">
                {{ c.latest_in_cycle && c.latest_in_cycle !== c.version ? `${strings.latestInCycle} ${c.latest_in_cycle}` : "" }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </template>

      <h2 class="text-h6 mb-2">{{ strings.advisories }} ({{ deps.advisories.length }})</h2>
      <p v-if="deps.advisories.length === 0" class="text-body-2 mb-4">{{ strings.noAdvisories }}</p>
      <v-table v-else density="compact" class="elevation-1 mb-6">
        <tbody>
          <tr v-for="a in deps.advisories" :key="`${a.id}-${a.package}-${a.deployed}`" data-test="advisory-row">
            <td><v-chip :color="severityColor(a.severity)" size="x-small">{{ a.severity }}</v-chip></td>
            <td class="text-no-wrap">
              <code>{{ a.package }}@{{ a.deployed }}</code>
              <span v-if="!a.direct" class="text-caption text-medium-emphasis"> ({{ strings.transitive }})</span>
            </td>
            <td class="text-no-wrap">{{ a.fixed_in ? `${strings.fixedIn} ${a.fixed_in}` : strings.noFix }}</td>
            <td>
              <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
              <div class="text-body-2 dep-text">{{ a.untrusted.summary }}</div>
              <div class="text-caption text-medium-emphasis">{{ [a.id, ...a.aliases].join(" · ") }}</div>
              <div v-if="a.accepted" class="text-caption" data-test="advisory-accepted">
                <v-chip size="x-small" variant="outlined" class="mr-1">{{ strings.accepted }}</v-chip>
                {{ a.accepted.reason }}<template v-if="a.accepted.until"> ({{ strings.until }} {{ a.accepted.until }})</template>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>

      <h2 class="text-h6 mb-2">{{ strings.outdated }} ({{ deps.outdated.length }})</h2>
      <p v-if="deps.outdated.length === 0" class="text-body-2">{{ strings.noOutdated }}</p>
      <v-table v-else density="compact" class="elevation-1">
        <tbody>
          <tr v-for="o in deps.outdated" :key="o.name" data-test="outdated-row">
            <td><code>{{ o.name }}</code></td>
            <td class="text-no-wrap">{{ o.deployed }} → {{ o.latest }}</td>
            <td><v-chip :color="o.update === 'major' ? 'warning' : undefined" size="x-small">{{ o.update }}</v-chip></td>
            <td class="text-caption text-medium-emphasis text-no-wrap">
              {{ o.latest_published_at ? formatDate(o.latest_published_at) : "" }}
              <v-chip v-if="o.renovate_due" size="x-small" variant="outlined" class="ml-1">{{ strings.renovateDue }}</v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </template>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { useDependenciesPageLoader } from "./Dependencies.loader.ts";
import { ops_dependencies as strings } from "./Dependencies.strings.ts";

const { dependenciesQuery } = useDependenciesPageLoader();
const deps = computed(() => dependenciesQuery.data.value?.dependencies ?? null);

const severityColor = (s: string) => ({ critical: "error", high: "error", moderate: "warning", low: "info" })[s] ?? "grey";
const formatTime = (ts: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
const formatDate = (ts: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(ts));
</script>

<style scoped>
.dep-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
