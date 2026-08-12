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
          :title="node.kind === 'package' ? node.packageKind : undefined"
        />
        <span class="pkg-tree__label">{{ node.label }}</span>
        <span v-if="node.kind === 'package'" class="pkg-tree__meta">
          <span
            v-if="node.packageSize"
            class="pkg-tree__size"
            :class="`pkg-tree__size--${node.packageSize}`"
            :title="sizeTitle(node.packageSize)"
          >{{ node.packageSize }}</span>
        </span>
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
import {
  PACKAGE_SIZE_LABELS,
  type PackageSizeTier,
} from "../package-size";

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

const sizeTitle = (tier: PackageSizeTier) =>
  `Size: ${PACKAGE_SIZE_LABELS[tier]}`;
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pkg-tree__meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}
.pkg-tree__size {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 0.05rem 0.28rem;
  border-radius: 3px;
  line-height: 1.2;
}
.pkg-tree__size--S {
  background: rgba(var(--v-theme-success), 0.18);
  color: rgb(var(--v-theme-success));
}
.pkg-tree__size--M {
  background: rgba(var(--v-theme-info), 0.18);
  color: rgb(var(--v-theme-info));
}
.pkg-tree__size--L {
  background: rgba(var(--v-theme-warning), 0.22);
  color: rgb(var(--v-theme-warning));
}
.pkg-tree__size--XL {
  background: rgba(var(--v-theme-error), 0.18);
  color: rgb(var(--v-theme-error));
}
.pkg-tree__icon {
  opacity: 0.75;
  flex-shrink: 0;
}
</style>
