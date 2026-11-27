<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-2">{{ strings.title }}</AdminPageTitle>

    <p v-if="!deps" class="saf-admin-empty">{{ strings.none }}</p>
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
        <AdminPanel :title="strings.runtime" class="mb-4">
        <v-table>
          <tbody>
            <tr v-for="c in deps.runtime" :key="c.name" data-test="runtime-row">
              <td>
                <code>{{ c.name }} {{ c.version }}</code>
                <span class="text-caption text-medium-emphasis"> ({{ c.scope === "host" ? strings.scopeHost : strings.scopeImage }})</span>
              </td>
              <td class="text-no-wrap">
                {{ c.eol ? `${strings.eol} ${formatDate(c.eol)}` : strings.eolUnknown }}
                <v-chip v-if="c.eol_soon" color="warning" size="x-small" class="ml-1">{{ strings.eolSoon }}</v-chip>
              </td>
              <td class="text-caption text-medium-emphasis text-no-wrap saf-admin-hide-xs">
                {{ c.latest_in_cycle && c.latest_in_cycle !== c.version ? `${strings.latestInCycle} ${c.latest_in_cycle}` : "" }}
              </td>
            </tr>
          </tbody>
        </v-table>
        </AdminPanel>
      </template>

      <AdminPanel :title="`${strings.advisories} (${deps.advisories.length})`" class="mb-4">
      <p v-if="deps.advisories.length === 0" class="text-body-2 text-medium-emphasis pa-4 ma-0">{{ strings.noAdvisories }}</p>
      <v-table v-else>
        <tbody>
          <tr v-for="a in deps.advisories" :key="`${a.id}-${a.package}-${a.deployed}`" data-test="advisory-row">
            <td><v-chip :color="severityColor(a.severity)" size="x-small">{{ a.severity }}</v-chip></td>
            <td class="text-no-wrap">
              <code>{{ a.package }}@{{ a.deployed }}</code>
              <!-- Base image OS package: fixed by rebuilding the image, not a package bump. -->
              <span v-if="a.ecosystem && a.ecosystem !== 'npm'" class="text-caption text-medium-emphasis" :title="strings.osHint" data-test="advisory-os">
                ({{ a.ecosystem }})
              </span>
              <span v-else-if="!a.direct" class="text-caption text-medium-emphasis"> ({{ strings.transitive }})</span>
            </td>
            <td class="text-no-wrap saf-admin-hide-xs">{{ a.fixed_in ? `${strings.fixedIn} ${a.fixed_in}` : strings.noFix }}</td>
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
      </AdminPanel>

      <AdminPanel :title="`${strings.outdated} (${deps.outdated.length})`">
      <p v-if="deps.outdated.length === 0" class="text-body-2 text-medium-emphasis pa-4 ma-0">{{ strings.noOutdated }}</p>
      <v-table v-else>
        <tbody>
          <template v-for="o in deps.outdated" :key="o.name">
          <tr
            data-test="outdated-row"
            :class="{ 'dep-row--expandable': o.release_notes?.length }"
            @click="o.release_notes?.length && toggle(o.name)"
          >
            <td>
              <code>{{ o.name }}</code>
              <v-icon
                v-if="o.release_notes?.length"
                :icon="openNotes.has(o.name) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                size="16"
                class="ms-1 text-medium-emphasis"
              />
            </td>
            <td class="text-no-wrap">{{ o.deployed }} → {{ o.latest }}</td>
            <td class="saf-admin-hide-xs"><v-chip :color="o.update === 'major' ? 'warning' : undefined" size="x-small">{{ o.update }}</v-chip></td>
            <td class="text-caption text-medium-emphasis text-no-wrap saf-admin-hide-xs">
              {{ o.latest_published_at ? formatDate(o.latest_published_at) : "" }}
              <v-chip v-if="o.renovate_due" size="x-small" variant="outlined" class="ml-1">{{ strings.renovateDue }}</v-chip>
            </td>
            <td class="text-right">
              <v-btn
                v-if="o.releases_url"
                icon="mdi-open-in-new"
                size="small"
                variant="text"
                :href="o.releases_url"
                target="_blank"
                rel="noopener noreferrer"
                :title="strings.changelog"
                :aria-label="`${strings.changelog}: ${o.name}`"
                data-test="dep-changelog"
                @click.stop
              />
            </td>
          </tr>
          <tr v-if="openNotes.has(o.name) && o.release_notes?.length" class="dep-notes-row" data-test="dep-notes">
            <td colspan="5">
              <div v-for="n in o.release_notes" :key="n.version" class="dep-note">
                <div class="d-flex align-baseline ga-2 mb-1">
                  <a :href="n.url" target="_blank" rel="noopener noreferrer" class="font-weight-medium"><code>{{ n.version }}</code></a>
                  <span v-if="n.published_at" class="text-caption text-medium-emphasis">{{ formatDate(n.published_at) }}</span>
                </div>
                <!-- Outside text: plain interpolation only (escaped), never v-html. -->
                <div class="dep-note__body">{{ n.body || strings.noNotes }}</div>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </v-table>
      </AdminPanel>
    </template>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { AdminPageTitle, AdminPanel, ContentWidth } from "@saflib/vue/components";
import { useDependenciesPageLoader } from "./Dependencies.loader.ts";
import { ops_dependencies as strings } from "./Dependencies.strings.ts";

const { dependenciesQuery } = useDependenciesPageLoader();
const deps = computed(() => dependenciesQuery.data.value?.dependencies ?? null);

// Which outdated packages have their release notes open.
const openNotes = ref(new Set<string>());
function toggle(name: string) {
  const next = new Set(openNotes.value);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  openNotes.value = next;
}

const severityColor = (s: string) => ({ critical: "error", high: "error", moderate: "warning", low: "info" })[s] ?? "grey";
const formatTime = (ts: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
const formatDate = (ts: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(ts));
</script>

<style scoped>
.dep-row--expandable {
  cursor: pointer;
}
.dep-notes-row > td {
  background: #fcfaf3;
  padding: 10px 16px !important;
}
.dep-note + .dep-note {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f2eee2;
}
.dep-note__body {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.8125rem;
  max-height: 240px;
  overflow: auto;
}

.dep-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
