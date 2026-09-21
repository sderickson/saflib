<template>
  <p v-if="tree.length === 0" class="text-body-2 text-medium-emphasis">
    No previewable file changes.
  </p>
  <ul v-else class="preview-tree">
    <PreviewFileTreeNode v-for="node in tree" :key="node.path" :node="node" />
  </ul>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { buildPreviewFileTree, dedupePreviewFiles, type PreviewFile } from "../preview-file-tree.ts";
import PreviewFileTreeNode from "./PreviewFileTreeNode.vue";

const props = defineProps<{ files: PreviewFile[] }>();
const tree = computed(() => buildPreviewFileTree(dedupePreviewFiles(props.files)));
</script>

<style scoped>
.preview-tree {
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
}
</style>
