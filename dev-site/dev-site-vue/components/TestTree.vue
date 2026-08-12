<template>
  <ul class="test-tree" :class="{ 'test-tree--root': depth === 0 }">
    <li v-for="node in nodes" :key="node.id" class="test-tree__item">
      <article v-if="node.kind === 'suite'" class="suite-card">
        <header class="suite-card__head">
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

        <div class="suite-card__tests">
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

      <section v-else-if="node.kind === 'dir'" class="tree-section tree-section--dir">
        <h3 class="tree-section__title tree-section__title--dir">
          {{ node.label }}/
        </h3>
        <TestTree
          v-if="node.children.length"
          :nodes="node.children"
          :depth="depth + 1"
          @open-source="$emit('open-source', $event)"
        />
      </section>

      <section v-else-if="node.kind === 'file'" class="tree-section tree-section--file">
        <h4 class="tree-section__title tree-section__title--file">
          {{ node.label }}
        </h4>
        <TestTree
          v-if="node.children.length"
          :nodes="node.children"
          :depth="depth + 1"
          @open-source="$emit('open-source', $event)"
        />
      </section>

      <div v-else class="test-tree__bare-test">{{ node.label }}</div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { TestTreeNode } from "../test-tree";

withDefaults(
  defineProps<{
    nodes: TestTreeNode[];
    depth?: number;
  }>(),
  { depth: 0 },
);

defineEmits<{
  "open-source": [filePath: string];
}>();

const testLeaves = (node: TestTreeNode) =>
  node.children.filter((c) => c.kind === "test");

const nestedSuites = (node: TestTreeNode) =>
  node.children.filter((c) => c.kind === "suite");
</script>

<style scoped>
.test-tree {
  list-style: none;
  margin: 0;
  padding-left: 0;
}
.test-tree__item {
  margin: 0.5rem 0;
}
.test-tree--root > .test-tree__item {
  margin-top: 0.75rem;
}
.test-tree--root > .test-tree__item:first-child {
  margin-top: 0;
}

.tree-section {
  margin: 0;
}
.tree-section__title {
  margin: 0 0 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: inherit;
}
.tree-section__title--dir {
  font-size: 0.95rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.tree-section__title--file {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.tree-section--file {
  margin-top: 0.85rem;
}
.tree-section--dir + .tree-section--dir {
  margin-top: 1.25rem;
}

.test-tree__bare-test {
  font-size: 0.875rem;
  padding-left: 0.5rem;
}

.suite-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 1);
  overflow: hidden;
  max-width: 44rem;
  margin-bottom: 0.65rem;
}
.suite-card__head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  background: rgba(var(--v-theme-on-surface), 0.03);
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
  margin-top: 0.5rem;
}
</style>
