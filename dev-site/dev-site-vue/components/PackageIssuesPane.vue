<template>
  <div class="pane-root">
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" class="mb-2">{{ error.message }}</v-alert>

    <div class="pane-scroll">
      <div class="issues-cli mb-4">
        <div class="text-caption text-medium-emphasis mb-1">
          Same list via CLI (working tree — no DB scan required):
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
        <h3 class="issues__heading">Package issues</h3>
        <p class="issues__hint">
          Dead code and layout findings. Triage guide:
          <code>saflib/dev-tools/docs/package-issues.md</code>
          (un-export, split tested helpers, scripts/bin CLI, delete, or fix the
          tool). Also: <code>analyze-package</code>.
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
    `npm exec -- saf-dev-site issues --workdir --package ${shellQuote(props.packageName)}`,
);

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

async function copyCli() {
  try {
    await navigator.clipboard.writeText(cliCommand.value);
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
.pane-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.pane-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
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
