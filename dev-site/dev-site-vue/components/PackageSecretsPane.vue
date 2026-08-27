<template>
  <div class="pane-root">
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />

    <div v-if="!isLoading && !entries.length" class="text-body-2 text-medium-emphasis">
      This package declares no secrets.
    </div>

    <v-table v-else-if="entries.length" density="compact" class="secrets-table">
      <thead>
        <tr>
          <th class="text-left">Name</th>
          <th class="text-left">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.name">
          <td>
            <code class="secrets-table__name">{{ entry.name }}</code>
          </td>
          <td class="secrets-table__desc">{{ entry.description }}</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRepoFile } from "../requests/queries";
import { repoPathPrefix } from "../repo-paths";

const props = defineProps<{
  subdomain: string;
  commitHash: string;
  packageDirectory: string;
  productRoot?: string;
}>();

const secretsPath = computed(() => {
  if (!props.commitHash) return "";
  const prefix = repoPathPrefix(props.productRoot ?? "", props.packageDirectory);
  return prefix ? `${prefix}/secrets.json` : "secrets.json";
});

const { data, isLoading, error } = useRepoFile(props.subdomain, () => ({
  ref: props.commitHash,
  path: secretsPath.value,
}));

type SecretEntry = { name: string; description: string };

const entries = computed((): SecretEntry[] => {
  if (error.value) return [];
  const content = data.value?.content;
  if (!content?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is SecretEntry =>
          typeof row === "object" &&
          row !== null &&
          typeof (row as SecretEntry).name === "string" &&
          typeof (row as SecretEntry).description === "string",
      )
      .map((row) => ({
        name: row.name,
        description: row.description,
      }));
  } catch {
    return [];
  }
});
</script>

<style scoped>
.pane-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 0.25rem 0.35rem;
}
.secrets-table__name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
}
.secrets-table__desc {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
  white-space: normal;
}
</style>
