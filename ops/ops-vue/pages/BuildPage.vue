<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.build }}</AdminPageTitle>
    <AdminPanel padded class="diagnostics-build">
      <dl class="build-grid">
        <template v-for="c in [build.root, build.saflib]" :key="c.label">
          <dt>{{ c.label }}</dt>
          <dd>
            <a v-if="c.href" :href="c.href" target="_blank" rel="noopener noreferrer"><code>{{ c.sha.slice(0, 12) }}</code></a>
            <code v-else>{{ c.sha }}</code>
          </dd>
        </template>
        <dt>{{ strings.build_rows.started }}</dt>
        <dd>{{ startedAt }}</dd>
        <dt>{{ strings.build_rows.env }}</dt>
        <dd>{{ deployment }}</dd>
      </dl>
    </AdminPanel>

    <AdminPanel :title="strings.deploys_title" class="mt-4" data-test="deploy-history">
      <v-progress-linear v-if="deploysQuery.isPending.value" indeterminate />
      <p v-else-if="!deploys.length" class="text-body-2 text-medium-emphasis pa-4 ma-0">{{ strings.no_deploys }}</p>
      <v-table v-else>
        <thead>
          <tr>
            <th>{{ strings.deploy_cols.when }}</th>
            <th>{{ strings.deploy_cols.commit }}</th>
            <th>{{ strings.deploy_cols.changes }}</th>
            <th class="saf-admin-hide-xs">{{ strings.deploy_cols.service }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in deploys" :key="d.id" data-test="deploy-row">
            <td class="text-no-wrap">{{ formatShortDateTime(d.started_at) }}</td>
            <td>
              <a v-if="commitLink(d.root)" :href="commitLink(d.root)" target="_blank" rel="noopener noreferrer"><code>{{ short(d.root) }}</code></a>
              <code v-else>{{ short(d.root) || "—" }}</code>
            </td>
            <td class="text-no-wrap">
              <a v-if="d.rootChanges" :href="d.rootChanges" target="_blank" rel="noopener noreferrer" data-test="deploy-root-changes">{{ strings.app_changes }}</a>
              <span v-if="d.rootChanges && d.saflibChanges" class="text-medium-emphasis"> · </span>
              <a v-if="d.saflibChanges" :href="d.saflibChanges" target="_blank" rel="noopener noreferrer">{{ strings.saflib_changes }}</a>
              <span v-if="!d.rootChanges && !d.saflibChanges" class="text-medium-emphasis">—</span>
            </td>
            <td class="text-medium-emphasis saf-admin-hide-xs">{{ d.service_name }}</td>
          </tr>
        </tbody>
      </v-table>
    </AdminPanel>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { AdminPageTitle, AdminPanel, ContentWidth } from "@saflib/vue/components";
import { formatShortDateTime, getDeploymentName } from "@saflib/vue";
import { useOpsDeploys, useOpsDigest } from "../requests/queries.ts";
import { commitHref, compareHref, DEFAULT_SAFLIB_REPO_URL, getBuildCommits, type BuildRepoUrls } from "../components/build-info.ts";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

const props = defineProps<{ repos?: BuildRepoUrls }>();

const build = computed(() => getBuildCommits(props.repos));
const deployment = getDeploymentName() ?? "unknown";
const digest = useOpsDigest();
// Deploy history: each deploy's commits and what changed since the one before.
const deploysQuery = useOpsDeploys(30);
const deploys = computed(() => {
  const list = deploysQuery.data.value?.deploys ?? [];
  return list.map((d, i) => {
    const prev = list[i + 1];
    const root = d.release_commit_root ?? d.commit_root;
    const saflib = d.release_commit_saflib ?? d.commit_saflib;
    return {
      ...d,
      root,
      rootChanges: prev ? compareHref(props.repos?.root, prev.release_commit_root ?? prev.commit_root, root) : undefined,
      saflibChanges: prev
        ? compareHref(props.repos?.saflib ?? DEFAULT_SAFLIB_REPO_URL, prev.release_commit_saflib ?? prev.commit_saflib, saflib)
        : undefined,
    };
  });
});
const short = (sha: string | null | undefined) => (sha ?? "").replace(/-dirty$/, "").slice(0, 7);
const commitLink = (sha: string | null | undefined) => commitHref(props.repos?.root, (sha ?? "").replace(/-dirty$/, ""));
const startedAt = computed(() => {
  const iso = digest.data.value?.digest.process.started_at;
  return iso ? new Date(iso).toLocaleString() : "—";
});
</script>

<style scoped>
.diagnostics-build {
  max-width: 560px;
}
.diagnostics-build__section {
  margin: 20px 0 8px !important;
}
.diagnostics-deploys {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.875rem;
  display: grid;
  gap: 6px;
}
.diagnostics-deploys li {
  display: flex;
  gap: 12px;
  align-items: baseline;
}
.build-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 0.875rem;
}
.build-grid dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.build-grid dd {
  margin: 0;
}
</style>
