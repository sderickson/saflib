<template>
  <div class="display-component">
    <h2>{{ t(strings.title) }}</h2>
    <p>{{ t(strings.description) }}</p>
    <!-- TODO: Implement the display component based on the schemas from the spec package -->
    <!-- TODO: Use props that match the schemas exported by the adjacent "spec" package -->
    <!-- TODO: Add any strings to the strings.ts file, not directly in the component -->
  </div>
</template>

<script setup lang="ts">
import { __target_name__ as strings } from "./__TargetName__.strings";
import { useReverseT } from "../../i18n.ts";

const { t } = useReverseT();

// TODO: Define props based on the schemas from the spec package
// interface Props {
//   // Add props here based on the schemas exported by the adjacent "spec" package
// }
// const props = defineProps<Props>();
</script>
