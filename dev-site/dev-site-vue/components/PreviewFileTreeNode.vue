<template>
  <li class="preview-tree__node">
    <template v-if="node.children.length > 0">
      <span class="preview-tree__dir">{{ node.name }}/</span>
      <ul class="preview-tree__children">
        <PreviewFileTreeNode v-for="child in node.children" :key="child.path" :node="child" />
      </ul>
    </template>
    <span
      v-else
      class="preview-tree__file"
      :class="`preview-tree__file--${node.status}`"
    >
      <span class="preview-tree__marker">{{ node.status === "added" ? "+" : "~" }}</span>
      {{ node.name }}
    </span>
  </li>
</template>

<script setup lang="ts">
import type { PreviewTreeNode } from "../preview-file-tree.ts";

defineOptions({ name: "PreviewFileTreeNode" });
defineProps<{ node: PreviewTreeNode }>();
</script>

<style scoped>
.preview-tree__node {
  list-style: none;
}
.preview-tree__children {
  margin: 0;
  padding-left: 1.1rem;
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.preview-tree__dir {
  opacity: 0.75;
}
.preview-tree__file {
  font-family: monospace;
}
.preview-tree__marker {
  display: inline-block;
  width: 1.1rem;
  font-weight: 700;
}
.preview-tree__file--added {
  color: rgb(var(--v-theme-success));
}
.preview-tree__file--modified {
  color: rgb(var(--v-theme-warning));
}
</style>
