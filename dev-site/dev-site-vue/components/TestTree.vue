<template>
  <ul class="test-tree">
    <li v-for="node in nodes" :key="node.id" class="test-tree__item">
      <div class="test-tree__row" :class="`test-tree__row--${node.kind}`">
        <button
          v-if="node.children.length"
          type="button"
          class="test-tree__toggle"
          @click="toggle(node.id)"
        >
          {{ open.has(node.id) ? "▾" : "▸" }}
        </button>
        <span v-else class="test-tree__toggle-spacer" />
        <span class="test-tree__label">{{ node.label }}</span>
        <span
          v-if="node.subjectSignature"
          class="test-tree__sig"
          :title="subjectTitle(node)"
        >{{ node.subjectSignature }}</span>
        <span class="test-tree__kind">{{ node.kind }}</span>
      </div>
      <TestTree
        v-if="node.children.length && open.has(node.id)"
        :nodes="node.children"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import type { TestTreeNode } from "../test-tree";

const props = defineProps<{
  nodes: TestTreeNode[];
}>();

const open = reactive(new Set<string>());

const expandAll = (nodes: TestTreeNode[]) => {
  for (const n of nodes) {
    if (n.children.length) {
      open.add(n.id);
      expandAll(n.children);
    }
  }
};

watch(
  () => props.nodes,
  (nodes) => {
    open.clear();
    expandAll(nodes);
  },
  { immediate: true },
);

const toggle = (id: string) => {
  if (open.has(id)) open.delete(id);
  else open.add(id);
};

const subjectTitle = (node: TestTreeNode) => {
  const parts = [
    node.subjectName ? `subject: ${node.subjectName}` : null,
    node.subjectConfidence ? `via ${node.subjectConfidence}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
};
</script>

<style scoped>
.test-tree {
  list-style: none;
  margin: 0;
  padding-left: 1rem;
}
.test-tree__item {
  margin: 0.15rem 0;
}
.test-tree__row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
}
.test-tree__toggle,
.test-tree__toggle-spacer {
  width: 1rem;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;
}
.test-tree__toggle-spacer {
  cursor: default;
}
.test-tree__kind {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.7rem;
  text-transform: uppercase;
}
.test-tree__sig {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 36rem;
}
.test-tree__row--test .test-tree__label {
  font-weight: 500;
}
</style>
