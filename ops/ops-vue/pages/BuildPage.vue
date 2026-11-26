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
      <h3 class="diagnostics-build__section">{{ strings.deploys_title }}</h3>
      <p v-if="!deploys.length" class="text-body-2 text-medium-emphasis" data-test="diagnostics-no-deploys">{{ strings.no_deploys }}</p>
      <ul v-else class="diagnostics-deploys" data-test="diagnostics-deploys">
        <li v-for="d in deploys" :key="d.id">
          <span>{{ formatWhen(d.started_at) }}</span>
          <code>{{ (d.commit_root ?? d.release_commit_root ?? d.build_ref ?? "").slice(0, 7) || "—" }}</code>
          <span class="text-medium-emphasis">{{ d.service_name }}</span>
        </li>
      </ul>
    </AdminPanel>

  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { AdminPageTitle, AdminPanel, ContentWidth } from "@saflib/vue/components";
import { getDeploymentName } from "@saflib/vue";
import { useOpsDigest } from "../requests/queries.ts";
import { getBuildCommits, type BuildRepoUrls } from "../components/build-info.ts";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

const props = defineProps<{ repos?: BuildRepoUrls }>();

const build = computed(() => getBuildCommits(props.repos));
const deployment = getDeploymentName() ?? "unknown";
const digest = useOpsDigest();
const deploys = computed(() => digest.data.value?.digest.deploys ?? []);
const startedAt = computed(() => {
  const iso = digest.data.value?.digest.process.started_at;
  return iso ? new Date(iso).toLocaleString() : "—";
});
const formatWhen = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
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
