<template>
  <ul class="pkg-tree">
    <li v-for="node in nodes" :key="node.id" class="pkg-tree__item">
      <button
        type="button"
        class="pkg-tree__row"
        :class="{
          'pkg-tree__row--package': node.kind === 'package',
          'pkg-tree__row--selected':
            node.kind === 'package' && node.package_name === selectedPackageName,
          'pkg-tree__row--added': node.change === 'added',
          'pkg-tree__row--removed': node.change === 'removed',
          'pkg-tree__row--modified': node.change === 'modified',
          'pkg-tree__row--moved': node.change === 'moved',
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
        <ChangeChip v-if="node.kind === 'package'" :change="node.change" />
        <span v-if="node.kind === 'package'" class="pkg-tree__meta">
          <v-tooltip location="end">
            <template #activator="{ props: tip }">
              <span
                v-bind="tip"
                class="pkg-tree__debt"
                :style="debtStyle(node)"
                aria-hidden="true"
              />
            </template>
            <span>{{ debtTip(node) }}</span>
          </v-tooltip>
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
  debtDotColor,
  debtDotSizePx,
  debtTooltipText,
} from "../package-debt";
import { emptyIssueCountsByKind } from "../package-issues";
import ChangeChip from "./ChangeChip.vue";

defineProps<{
  nodes: PackageDirNode[];
  selectedPackageName?: string;
}>();

const emit = defineEmits<{
  select: [package_name: string];
}>();

const onClick = (node: PackageDirNode) => {
  if (node.kind === "package" && node.package_name) {
    emit("select", node.package_name);
  }
};

const debtStyle = (node: PackageDirNode) => {
  const px = debtDotSizePx(node.packageSize);
  return {
    background: debtDotColor(node.debt_count ?? 0, node.source_lines ?? 0),
    width: `${px}px`,
    height: `${px}px`,
  };
};

const debtTip = (node: PackageDirNode) =>
  debtTooltipText({
    debt_count: node.debt_count ?? 0,
    issue_counts_by_kind: node.issue_counts_by_kind ?? emptyIssueCountsByKind(),
    packageSize: node.packageSize,
    source_lines: node.source_lines,
    test_lines: node.test_lines,
  });
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
.pkg-tree__row--added {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-success));
}
.pkg-tree__row--removed {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-error));
}
.pkg-tree__row--modified {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-warning));
}
.pkg-tree__row--moved {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-info));
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
.pkg-tree__debt {
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.pkg-tree__icon {
  opacity: 0.75;
  flex-shrink: 0;
}
</style>
