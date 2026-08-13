<template>
  <div>
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" class="mb-2">{{ error.message }}</v-alert>

    <div class="issues-cli mb-4">
      <div class="text-caption text-medium-emphasis mb-1">
        Same list via CLI (HEAD + daemon DB by default — paste to an agent):
      </div>
      <div class="issues-cli__row">
        <code class="issues-cli__cmd">{{ cliCommand }}</code>
        <v-btn
          size="small"
          variant="tonal"
          :color="copied ? 'success' : undefined"
          @click="copyCli"
        >
          {{ copied ? "Copied" : "Copy" }}
        </v-btn>
      </div>
    </div>

    <div v-if="!isLoading && !issues.length" class="text-body-2 text-medium-emphasis">
      No issues found for this package.
    </div>

    <section v-else-if="issues.length" class="issues">
      <h3 class="issues__heading">Dead code</h3>
      <p class="issues__hint">
        Exports with no non-test importers in this checkout. May mean the symbol
        is unused, only covered by tests, or missed by import resolution
        (barrels, dynamic imports).
      </p>
      <ul class="issues__list">
        <li
          v-for="issue in issues"
          :key="issue.repoPath + ':' + issue.name"
          class="issues__item"
        >
          <span class="issues__badge">{{ issue.title }}</span>
          <a
            href="#"
            class="issues__name"
            @click.prevent="openFile(issue.repoPath)"
          >
            {{ issue.name }}
          </a>
          <span class="issues__kind">{{ issue.kindLabel }}</span>
          <a
            href="#"
            class="issues__path"
            @click.prevent="openFile(issue.repoPath)"
          >
            {{ issue.filePath }}
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useCommitPackage } from "../requests/queries";
import { collectPackageIssues } from "../package-issues";
import { openSource } from "../source-links";

const props = defineProps<{
  subdomain: string;
  commitHash: string;
  packageName: string;
  packageDirectory: string;
  productRoot?: string;
  githubRepo?: string;
  githubRef?: string;
  localRepoRoot?: string;
}>();

const { data, isLoading, error } = useCommitPackage(
  props.subdomain,
  () => props.commitHash,
  () => props.packageName,
);

const issues = computed(() => {
  const d = data.value?.packageDetail;
  if (!d) return [];
  return collectPackageIssues(d, {
    packageDirectory: props.packageDirectory,
    productRoot: props.productRoot ?? "",
  });
});

const cliCommand = computed(
  () =>
    `npm exec -- saf-dev-site issues --package ${shellQuote(props.packageName)}`,
);

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

async function copyCli() {
  const text = [
    `Address Spec Issues (dead code) for ${props.packageName}.`,
    `Use the same rules as the dev-site Issues tab. Run this from the monorepo root, then triage/fix each listed export (delete unused, wire real callers, or note false positives):`,
    "",
    cliCommand.value,
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // ignore
  }
}

function shellQuote(s: string): string {
  if (/^[A-Za-z0-9_@./+=:-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

const openFile = (path: string) => {
  openSource(path, {
    githubRef: props.githubRef,
    githubRepo: props.githubRepo,
    localRepoRoot: props.localRepoRoot,
  });
};

defineExpose({
  issueCount: computed(() => issues.value.length),
});
</script>

<style scoped>
.issues-cli__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.5rem;
}
.issues-cli__cmd {
  flex: 1 1 16rem;
  display: block;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}
.issues__heading {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
}
.issues__hint {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.55);
  max-width: 40rem;
}
.issues__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}
.issues__item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem 0.55rem;
  padding: 0.4rem 0.55rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 6px;
  max-width: 44rem;
}
.issues__badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-warning));
  font-weight: 600;
}
.issues__name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  font-size: 0.85rem;
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(var(--v-theme-on-surface), 0.25);
  user-select: text;
}
.issues__kind {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.issues__path {
  flex: 1 1 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  word-break: break-all;
  user-select: text;
}
</style>
