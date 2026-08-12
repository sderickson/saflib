<template>
  <ul class="test-tree" :class="{ 'test-tree--root': depth === 0 }">
    <li v-for="node in nodes" :key="node.id" class="test-tree__item">
      <!-- Suite card -->
      <article v-if="node.kind === 'suite'" class="suite-card">
        <header class="suite-card__head">
          <button
            type="button"
            class="suite-card__toggle"
            :aria-expanded="open.has(node.id)"
            @click="toggle(node.id)"
          >
            {{ open.has(node.id) ? "▾" : "▸" }}
          </button>
          <button
            v-if="node.subjectFilePath"
            type="button"
            class="suite-card__name suite-card__name--link"
            @click="$emit('open-source', node.subjectFilePath!)"
          >
            {{ node.label }}
          </button>
          <span v-else class="suite-card__name">{{ node.label }}</span>
        </header>

        <div
          v-if="node.subjectSignature || node.subjectDocstring"
          class="suite-card__spec"
        >
          <code v-if="node.subjectSignature" class="suite-card__sig">{{
            node.subjectSignature
          }}</code>
          <p v-if="node.subjectDocstring" class="suite-card__doc">
            {{ node.subjectDocstring }}
          </p>
        </div>

        <div v-if="open.has(node.id)" class="suite-card__tests">
          <ul v-if="testLeaves(node).length" class="suite-card__cases">
            <li
              v-for="t in testLeaves(node)"
              :key="t.id"
              class="suite-card__case"
            >
              {{ t.label }}
            </li>
          </ul>
          <TestTree
            v-if="nestedSuites(node).length"
            :nodes="nestedSuites(node)"
            :depth="depth + 1"
            @open-source="$emit('open-source', $event)"
          />
        </div>
      </article>

      <!-- Dir / file / bare test (outside a card) -->
      <template v-else>
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
          <span class="test-tree__kind">{{ node.kind }}</span>
        </div>
        <TestTree
          v-if="node.children.length && open.has(node.id)"
          :nodes="node.children"
          :depth="depth + 1"
          @open-source="$emit('open-source', $event)"
        />
      </template>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import type { TestTreeNode } from "../test-tree";

const props = withDefaults(
  defineProps<{
    nodes: TestTreeNode[];
    depth?: number;
  }>(),
  { depth: 0 },
);

defineEmits<{
  "open-source": [filePath: string];
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

const testLeaves = (node: TestTreeNode) =>
  node.children.filter((c) => c.kind === "test");

const nestedSuites = (node: TestTreeNode) =>
  node.children.filter((c) => c.kind === "suite");
</script>

<style scoped>
.test-tree {
  list-style: none;
  margin: 0;
  padding-left: 0.75rem;
}
.test-tree--root {
  padding-left: 0;
}
.test-tree__item {
  margin: 0.35rem 0;
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
.test-tree__label {
  color: inherit;
  font: inherit;
}
.test-tree__kind {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.7rem;
  text-transform: uppercase;
}

.suite-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 1);
  overflow: hidden;
  max-width: 44rem;
}
.suite-card__head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  background: rgba(var(--v-theme-on-surface), 0.03);
}
.suite-card__toggle {
  width: 1rem;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;
  flex-shrink: 0;
}
.suite-card__name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
  font-weight: 600;
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  text-align: left;
}
.suite-card__name--link {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(var(--v-theme-on-surface), 0.25);
}
.suite-card__spec {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  background: rgba(var(--v-theme-on-surface), 0.015);
}
.suite-card__sig {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-weight: 400;
  word-break: break-word;
}
.suite-card__doc {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.suite-card__spec .suite-card__doc:first-child {
  margin-top: 0;
}
.suite-card__tests {
  padding: 0.45rem 0.75rem 0.65rem;
}
.suite-card__cases {
  list-style: none;
  margin: 0;
  padding: 0;
}
.suite-card__case {
  position: relative;
  padding: 0.28rem 0 0.28rem 0.9rem;
  font-size: 0.875rem;
  line-height: 1.35;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.suite-card__case:last-child {
  border-bottom: 0;
}
.suite-card__case::before {
  content: "";
  position: absolute;
  left: 0.15rem;
  top: 0.7rem;
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.28);
}
.suite-card__tests > .test-tree {
  padding-left: 0;
  margin-top: 0.5rem;
}
</style>
