<template>
  <div class="pane-root">
    <v-progress-linear v-if="filesLoading" indeterminate class="mb-2" />
    <v-alert v-if="filesError" type="error" class="mb-2" density="compact">
      {{ filesError.message }}
    </v-alert>

    <div v-if="!mdFiles.length && !filesLoading" class="text-body-2 text-medium-emphasis">
      No markdown docs under this package.
    </div>

    <ResizableColumns
      v-else
      class="pane-split"
      storage-key="dev-site.docs.navWidth"
      :default-left="180"
      :min-left="120"
      :max-left="360"
    >
      <template #left>
        <div class="pane-nav">
          <ul class="docs-nav">
            <li v-for="f in mdFiles" :key="f.path">
              <button
                type="button"
                class="docs-nav__btn"
                :class="{ 'docs-nav__btn--active': f.path === selectedPath }"
                @click="selectedPath = f.path"
              >
                {{ localPath(f.path) }}
              </button>
            </li>
          </ul>
        </div>
      </template>
      <template #right>
        <div class="pane-panel">
          <div class="d-flex ga-2 mb-2 flex-wrap">
            <v-btn
              size="small"
              variant="text"
              :disabled="!selectedPath"
              @click="openSelected"
            >
              Open source
            </v-btn>
          </div>
          <v-progress-linear v-if="fileLoading" indeterminate class="mb-2" />
          <v-alert v-if="fileError" type="error" density="compact">
            {{ fileError.message }}
          </v-alert>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            v-if="html"
            class="docs-html"
            v-html="html"
            @click="onDocClick"
          />
        </div>
      </template>
    </ResizableColumns>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { marked } from "marked";
import { useRepoFile, useRepoFiles } from "../requests/queries";
import { openSource } from "../source-links";
import { repoPathPrefix } from "../repo-paths";
import ResizableColumns from "./ResizableColumns.vue";

const props = defineProps<{
  subdomain: string;
  commitHash: string;
  packageDirectory: string;
  packageName: string;
  productRoot?: string;
  /** All analyzed packages — used to resolve cross-package doc links. */
  packages: Array<{ packageName: string; directory: string }>;
  githubRepo?: string;
  /** Branch/tag for GitHub links (default `main`). */
  githubRef?: string;
  localRepoRoot?: string;
}>();

const emit = defineEmits<{
  "navigate-package": [packageName: string, docPath: string];
}>();

const prefix = computed(() =>
  repoPathPrefix(props.productRoot, props.packageDirectory),
);

const {
  data: filesData,
  isLoading: filesLoading,
  error: filesError,
} = useRepoFiles(props.subdomain, () => ({
  ref: props.commitHash,
  prefix: prefix.value || undefined,
  ext: ".md",
}));

const mdFiles = computed(() => filesData.value?.files ?? []);

const selectedPath = ref("");

watch(
  mdFiles,
  (files) => {
    if (!files.length) {
      selectedPath.value = "";
      return;
    }
    // Prefer docs/README.md, then README.md, else first file.
    const preferred =
      files.find((f) => /(^|\/)docs\/README\.md$/i.test(f.path)) ||
      files.find((f) => /(^|\/)README\.md$/i.test(f.path)) ||
      files[0];
    if (
      !selectedPath.value ||
      !files.some((f) => f.path === selectedPath.value)
    ) {
      selectedPath.value = preferred?.path ?? "";
    }
  },
  { immediate: true },
);

const {
  data: fileData,
  isLoading: fileLoading,
  error: fileError,
} = useRepoFile(props.subdomain, () => ({
  ref: props.commitHash,
  path: selectedPath.value,
}));

const html = computed(() => {
  const content = fileData.value?.content;
  if (!content) return "";
  return marked.parse(content, { async: false }) as string;
});

const localPath = (path: string) => {
  const p = prefix.value;
  if (!p) return path;
  const pref = p.endsWith("/") ? p : `${p}/`;
  return path.startsWith(pref) ? path.slice(pref.length) : path;
};

const openSelected = () => {
  if (!selectedPath.value) return;
  openSource(selectedPath.value, {
    githubRef: props.githubRef,
    githubRepo: props.githubRepo,
    localRepoRoot: props.localRepoRoot,
  });
};

const resolveHref = (href: string): { kind: "md"; path: string } | { kind: "external"; href: string } | { kind: "source"; path: string } | null => {
  if (!href || href.startsWith("#")) return null;
  if (/^https?:\/\//i.test(href) || href.startsWith("mailto:")) {
    return { kind: "external", href };
  }
  // Resolve relative to current doc directory
  const baseDir = selectedPath.value.includes("/")
    ? selectedPath.value.slice(0, selectedPath.value.lastIndexOf("/"))
    : "";
  const joined = href.startsWith("/")
    ? href.replace(/^\/+/, "")
    : [baseDir, href].filter(Boolean).join("/");
  // Normalize ./ and ../
  const parts: string[] = [];
  for (const seg of joined.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  const path = parts.join("/");
  if (/\.md($|#)/i.test(path) || path.endsWith("/")) {
    const clean = path.replace(/#.*$/, "").replace(/\/$/, "");
    const withMd = clean.endsWith(".md") ? clean : `${clean}/README.md`;
    return { kind: "md", path: withMd };
  }
  return { kind: "source", path: path.replace(/#.*$/, "") };
};

const packageForPath = (path: string): string | null => {
  const matches = props.packages
    .filter((p) => {
      const d = repoPathPrefix(props.productRoot, p.directory);
      if (!d) return true;
      return path === d || path.startsWith(`${d}/`);
    })
    .sort(
      (a, b) =>
        repoPathPrefix(props.productRoot, b.directory).length -
        repoPathPrefix(props.productRoot, a.directory).length,
    );
  return matches[0]?.packageName ?? null;
};

const onDocClick = (ev: MouseEvent) => {
  const target = ev.target as HTMLElement | null;
  const a = target?.closest?.("a") as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href) return;
  const resolved = resolveHref(href);
  if (!resolved) return;
  if (resolved.kind === "external") return; // let browser handle

  ev.preventDefault();
  if (resolved.kind === "source") {
    openSource(resolved.path, {
      githubRef: props.githubRef,
      githubRepo: props.githubRepo,
      localRepoRoot: props.localRepoRoot,
    });
    return;
  }

  // md navigation
  const pkg = packageForPath(resolved.path);
  if (pkg && pkg !== props.packageName) {
    emit("navigate-package", pkg, resolved.path);
    return;
  }
  selectedPath.value = resolved.path;
};

// Allow parent to set doc path when switching packages via link
watch(
  () => props.packageDirectory,
  () => {
    selectedPath.value = "";
  },
);

defineExpose({
  openDoc(path: string) {
    selectedPath.value = path;
  },
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
.pane-split {
  flex: 1 1 auto;
  min-height: 0;
}
.pane-nav,
.pane-panel {
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 0.25rem 0.35rem;
}
.docs-nav {
  list-style: none;
  margin: 0;
  padding: 0;
}
.docs-nav__btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  cursor: pointer;
  color: inherit;
}
.docs-nav__btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.docs-nav__btn--active {
  background: rgba(var(--v-theme-primary), 0.12);
}
.docs-html :deep(h1),
.docs-html :deep(h2),
.docs-html :deep(h3) {
  margin-top: 1.1em;
  margin-bottom: 0.4em;
}
.docs-html :deep(p),
.docs-html :deep(ul),
.docs-html :deep(ol) {
  margin: 0.5em 0;
}
.docs-html :deep(pre) {
  overflow: auto;
  padding: 0.75rem;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 4px;
  font-size: 0.8rem;
}
.docs-html :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85em;
}
.docs-html :deep(a) {
  color: rgb(var(--v-theme-primary));
}
</style>
