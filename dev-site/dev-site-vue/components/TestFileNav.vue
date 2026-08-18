<template>
  <ul class="file-nav">
    <li v-for="node in nodes" :key="node.id" class="file-nav__item">
      <div class="file-nav__row-wrap">
        <button
          v-if="isCollapsible(node)"
          type="button"
          class="file-nav__toggle"
          :aria-expanded="isExpanded(node)"
          :aria-label="isExpanded(node) ? 'Collapse' : 'Expand'"
          @click.stop="toggle(node.localPath)"
        >
          <v-icon
            size="x-small"
            :icon="isExpanded(node) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
          />
        </button>
        <span
          v-else-if="needsToggleGutter(node)"
          class="file-nav__toggle-spacer"
        />
        <button
          type="button"
          class="file-nav__row"
          :class="{
            'file-nav__row--selected': isSelected(node),
            'file-nav__row--added': node.change === 'added',
            'file-nav__row--removed': node.change === 'removed',
            'file-nav__row--modified': node.change === 'modified',
            'file-nav__row--moved': node.change === 'moved',
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
          <ChangeChip :change="node.change" />
        </button>
      </div>
      <TestFileNav
        v-if="node.children.length && isExpanded(node)"
        :nodes="node.children"
        :selected="selected"
        :collapse-dirs-under="collapseDirsUnder"
        @select="$emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { inject, provide, shallowRef, watch, type ShallowRef } from "vue";
import {
  toModuleStem,
  toVueBundleStem,
  type TestFileNavNode,
  type TestScope,
} from "../test-tree";
import ChangeChip from "./ChangeChip.vue";

const COLLAPSE_KEY = Symbol("test-file-nav-collapse");

type CollapseStore = {
  expanded: ShallowRef<Set<string>>;
  toggle: (localPath: string) => void;
  isPathExpanded: (localPath: string) => boolean;
};

const props = defineProps<{
  nodes: TestFileNavNode[];
  selected: TestScope;
  /**
   * Dirs nested under this path (e.g. `handlers/matters`) are collapsible and
   * start collapsed. The root folder itself stays expanded.
   */
  collapseDirsUnder?: string;
  /** Match selected stems using Vue companion grouping. */
  vueBundles?: boolean;
}>();

defineEmits<{
  select: [scope: Extract<TestScope, { kind: "dir" | "file" }>];
}>();

const parentStore = inject<CollapseStore | null>(COLLAPSE_KEY, null);

let store = parentStore;
if (props.collapseDirsUnder && !parentStore) {
  const expanded = shallowRef(new Set<string>());
  store = {
    expanded,
    toggle(localPath: string) {
      const next = new Set(expanded.value);
      if (next.has(localPath)) next.delete(localPath);
      else next.add(localPath);
      expanded.value = next;
    },
    isPathExpanded(localPath: string) {
      return expanded.value.has(localPath);
    },
  };
  provide(COLLAPSE_KEY, store);

  watch(
    () => props.selected,
    (sel) => {
      const under = props.collapseDirsUnder;
      if (!under || sel.kind === "all") return;
      const next = new Set(expanded.value);
      let changed = false;
      const parts = sel.localPath.split("/").filter(Boolean);
      let acc = "";
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        if (acc.startsWith(`${under}/`) && !next.has(acc)) {
          next.add(acc);
          changed = true;
        }
      }
      if (changed) expanded.value = next;
    },
    { immediate: true },
  );
}

const isCollapsible = (node: TestFileNavNode): boolean => {
  if (node.kind !== "dir" || !node.children.length) return false;
  const under = props.collapseDirsUnder;
  if (!under || !store) return false;
  // Nested under handlers/, not handlers itself.
  return node.localPath.startsWith(`${under}/`);
};

/** Spacer only for rows that sit beside chevron toggles (not the collapse root). */
const needsToggleGutter = (node: TestFileNavNode): boolean => {
  const under = props.collapseDirsUnder;
  if (!under || !store) return false;
  if (isCollapsible(node)) return false;
  return node.localPath.startsWith(`${under}/`);
};

const isExpanded = (node: TestFileNavNode): boolean => {
  if (!isCollapsible(node) || !store) return true;
  return store.isPathExpanded(node.localPath);
};

const toggle = (localPath: string) => {
  store?.toggle(localPath);
};

const isSelected = (node: TestFileNavNode) => {
  if (props.selected.kind === "all") return false;
  if (props.selected.kind === "dir") {
    return node.kind === "dir" && props.selected.localPath === node.localPath;
  }
  const stem = props.vueBundles
    ? toVueBundleStem(props.selected.localPath)
    : toModuleStem(props.selected.localPath);
  return node.kind === "file" && node.localPath === stem;
};

const navIcon = (node: TestFileNavNode): string => {
  if (node.kind === "dir") return "mdi-folder-outline";
  if (node.hasVueComponent) return "mdi-vuejs";
  if (node.presence === "test") return "mdi-test-tube";
  if (!node.hasCardExports) return "mdi-circle-small";
  if (node.presence === "both") return "mdi-file-document-outline";
  return "mdi-file-outline";
};

const navTitle = (node: TestFileNavNode): string => {
  let title = "Source only";
  if (node.kind === "dir") title = "Directory";
  else if (node.hasVueComponent) {
    title = node.loadableAsync
      ? "Vue component (async)"
      : "Vue component";
  } else if (node.presence === "test") title = "Test only";
  else if (!node.hasCardExports) {
    title =
      node.presence === "both"
        ? "Types/constants + colocated test"
        : "Source only (no functions)";
  } else if (node.presence === "both") title = "Source + colocated test";
  if (node.movedFrom) return `Moved from ${node.movedFrom} · ${title}`;
  return title;
};
</script>

<style scoped>
.file-nav {
  list-style: none;
  margin: 0;
  padding-left: 0;
}
.file-nav :deep(.file-nav) {
  padding-left: 0.75rem;
}
.file-nav__item {
  margin: 0.05rem 0;
}
.file-nav__row-wrap {
  display: flex;
  align-items: center;
  min-width: 0;
}
.file-nav__toggle,
.file-nav__toggle-spacer {
  flex: 0 0 1.1rem;
  width: 1.1rem;
  height: 1.25rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.65;
}
.file-nav__toggle:hover {
  opacity: 1;
}
.file-nav__toggle-spacer {
  cursor: default;
  pointer-events: none;
}
.file-nav__row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex: 1 1 auto;
  min-width: 0;
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
.file-nav__row--added {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-success));
}
.file-nav__row--removed {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-error));
}
.file-nav__row--modified {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-warning));
}
.file-nav__row--moved {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-info));
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
