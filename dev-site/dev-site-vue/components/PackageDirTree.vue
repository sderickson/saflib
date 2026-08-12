<template>
  <ul class="pkg-tree">
    <li v-for="node in nodes" :key="node.id" class="pkg-tree__item">
      <button
        type="button"
        class="pkg-tree__row"
        :class="{
          'pkg-tree__row--package': node.kind === 'package',
          'pkg-tree__row--selected':
            node.kind === 'package' && node.packageName === selectedPackageName,
        }"
        @click="onClick(node)"
      >
        <v-icon
          size="small"
          :icon="
            node.kind === 'package'
              ? packageKindIcon(node.packageKind)
              : 'mdi-folder-outline'
          "
          class="pkg-tree__icon"
        />
        <span class="pkg-tree__label">{{ node.label }}</span>
        <span v-if="node.kind === 'package'" class="pkg-tree__kind">{{
          node.packageKind
        }}</span>
      </button>
      <PackageDirTree
        v-if="node.children.length"
        :nodes="node.children"
        :selected-package-name="selectedPackageName"
        @select="$emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { PackageDirNode } from "../package-dir-tree";
import { packageKindIcon } from "../package-dir-tree";

defineProps<{
  nodes: PackageDirNode[];
  selectedPackageName?: string;
}>();

const emit = defineEmits<{
  select: [packageName: string];
}>();

const onClick = (node: PackageDirNode) => {
  if (node.kind === "package" && node.packageName) {
    emit("select", node.packageName);
  }
};
</script>

<style scoped>
.pkg-tree {
  list-style: none;
  margin: 0;
  padding-left: 0.85rem;
}
.pkg-tree__item {
  margin: 0.05rem 0;
}
.pkg-tree__row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
  cursor: default;
  color: inherit;
  font: inherit;
}
.pkg-tree__row--package {
  cursor: pointer;
}
.pkg-tree__row--package:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.pkg-tree__row--selected {
  background: rgba(var(--v-theme-primary), 0.12);
}
.pkg-tree__label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
}
.pkg-tree__kind {
  margin-left: auto;
  font-size: 0.65rem;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.pkg-tree__icon {
  opacity: 0.75;
}
</style>
