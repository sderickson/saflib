<template>
  <v-tooltip location="bottom">
    <template #activator="{ props: tooltipProps }">
      <v-chip
        v-bind="tooltipProps"
        size="small"
        variant="tonal"
        :href="build.root.href"
        :target="build.root.href ? '_blank' : undefined"
        :rel="build.root.href ? 'noopener noreferrer' : undefined"
        data-test="build-chip"
      >
        {{ deployment }} ·
        <code class="ms-1">{{ build.root.shortSha }}</code>
      </v-chip>
    </template>
    <div class="text-caption">
      <div class="font-weight-medium">{{ strings.tooltip }}</div>
      <div v-for="c in [build.root, build.saflib]" :key="c.label">
        {{ c.label }}: <code>{{ c.shortSha }}</code>
      </div>
    </div>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { build_chip as strings } from "./BuildChip.strings.ts";
import { getBuildCommits, getDeploymentLabel, type BuildRepoUrls } from "./build-info.ts";

const props = defineProps<{
  /** Repo URLs for commit links. saflib defaults to its public repo. */
  repos?: BuildRepoUrls;
}>();

const build = computed(() => getBuildCommits(props.repos));
const deployment = getDeploymentLabel();
</script>
