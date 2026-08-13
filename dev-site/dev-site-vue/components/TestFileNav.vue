<template>
  <ul class="file-nav">
    <li v-for="node in nodes" :key="node.id" class="file-nav__item">
      <button
        type="button"
        class="file-nav__row"
        :class="{
          'file-nav__row--selected': isSelected(node),
        }"
        @click="$emit('select', { kind: node.kind, localPath: node.localPath })"
      >
        <v-icon
          size="x-small"
          :icon="navIcon(node)"
          class="file-nav__icon"
          :title="navTitle(node)"
        />
        <span class="file-nav__label">{{ node.label }}</span>
      </button>
      <TestFileNav
        v-if="node.children.length"
        :nodes="node.children"
        :selected="selected"
        @select="$emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import {
  toModuleStem,
  type TestFileNavNode,
  type TestScope,
} from "../test-tree";

const props = defineProps<{
  nodes: TestFileNavNode[];
  selected: TestScope;
}>();

defineEmits<{
  select: [scope: Extract<TestScope, { kind: "dir" | "file" }>];
}>();

const isSelected = (node: TestFileNavNode) => {
  if (props.selected.kind === "all") return false;
  if (props.selected.kind === "dir") {
    return node.kind === "dir" && props.selected.localPath === node.localPath;
  }
  return (
    node.kind === "file" &&
    toModuleStem(props.selected.localPath) === node.localPath
  );
};

const navIcon = (node: TestFileNavNode): string => {
  if (node.kind === "dir") return "mdi-folder-outline";
  if (node.presence === "test") return "mdi-test-tube";
  // Quiet mark for modules with no function/class/const exports (e.g. types.ts).
  if (!node.hasCardExports) return "mdi-circle-small";
  if (node.presence === "both") return "mdi-file-document-outline";
  return "mdi-file-outline";
};

const navTitle = (node: TestFileNavNode): string => {
  if (node.kind === "dir") return "Directory";
  if (node.presence === "test") return "Test only";
  if (!node.hasCardExports) {
    return node.presence === "both"
      ? "Types/constants + colocated test"
      : "Source only (no functions)";
  }
  if (node.presence === "both") return "Source + colocated test";
  return "Source only";
};
</script>

<style scoped>
.file-nav {
  list-style: none;
  margin: 0;
  padding-left: 0.75rem;
}
.file-nav__item {
  margin: 0.05rem 0;
}
.file-nav__row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.file-nav__row:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.file-nav__row--selected {
  background: rgba(var(--v-theme-primary), 0.12);
}
.file-nav__label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-nav__icon {
  opacity: 0.7;
  flex-shrink: 0;
}
</style>
