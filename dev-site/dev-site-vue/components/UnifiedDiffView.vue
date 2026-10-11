<template>
  <div class="unified-diff">
    <section v-for="file in files" :key="file.path" class="unified-diff__file">
      <header class="unified-diff__file-head">
        <code class="unified-diff__path">{{ displayPath(file) }}</code>
        <v-btn
          icon
          size="x-small"
          variant="text"
          :aria-label="`Copy path ${copyPathFor(file)}`"
          @click="copyPath(copyPathFor(file))"
        >
          <v-icon
            size="small"
            :icon="copiedPath === copyPathFor(file) ? 'mdi-check' : 'mdi-content-copy'"
          />
        </v-btn>
      </header>
      <div class="unified-diff__body">
        <div
          v-for="(line, index) in file.lines"
          :key="index"
          class="unified-diff__line"
          :class="`unified-diff__line--${line.kind}`"
        >
          <span class="unified-diff__sign" aria-hidden="true">{{ lineSign(line) }}</span>
          <span class="unified-diff__text">{{ line.text }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { DiffDisplayLine, ParsedDiffFile } from "../parse-unified-diff.ts";

defineProps<{
  files: ParsedDiffFile[];
}>();

const copiedPath = ref<string | null>(null);
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

function copyPathFor(file: ParsedDiffFile): string {
  return file.path;
}

function displayPath(file: ParsedDiffFile): string {
  if (file.oldPath && file.newPath && file.oldPath !== file.newPath) {
    return `${file.oldPath} → ${file.newPath}`;
  }
  return file.path;
}

async function copyPath(path: string) {
  if (typeof navigator.clipboard?.writeText !== "function") return;
  await navigator.clipboard.writeText(path);
  copiedPath.value = path;
  if (copyResetTimer) clearTimeout(copyResetTimer);
  copyResetTimer = setTimeout(() => {
    if (copiedPath.value === path) copiedPath.value = null;
  }, 2000);
}

function lineSign(line: DiffDisplayLine): string {
  switch (line.kind) {
    case "add":
      return "+";
    case "del":
      return "−";
    case "ctx":
      return " ";
    default:
      return "";
  }
}
</script>

<style scoped>
.unified-diff__file {
  margin-bottom: 1.25rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
  overflow: hidden;
}
.unified-diff__file-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.unified-diff__path {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.8rem;
  word-break: break-all;
}
.unified-diff__body {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  overflow-x: auto;
}
.unified-diff__line {
  display: flex;
  white-space: pre;
  min-height: 1.4em;
}
.unified-diff__sign {
  flex: 0 0 1.25rem;
  text-align: center;
  user-select: none;
  opacity: 0.55;
}
.unified-diff__text {
  flex: 1 1 auto;
  padding-right: 0.5rem;
}
.unified-diff__line--add {
  background: rgba(46, 160, 67, 0.18);
}
.unified-diff__line--add .unified-diff__sign {
  color: rgb(26, 127, 55);
  opacity: 1;
}
.unified-diff__line--del {
  background: rgba(248, 81, 73, 0.16);
}
.unified-diff__line--del .unified-diff__sign {
  color: rgb(207, 34, 46);
  opacity: 1;
}
.unified-diff__line--hunk {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}
.unified-diff__line--hunk .unified-diff__sign {
  display: none;
}
.unified-diff__line--meta {
  opacity: 0.55;
}
.unified-diff__line--ctx {
  background: transparent;
}
</style>
