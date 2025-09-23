<template>
  <div>
    <h2>{{ t(strings.title) }}</h2>
    <p>{{ t(strings.description) }}</p>
    <!-- TODO: Implement the display component based on the schemas from the spec package -->
    <!-- TODO: Use props that match the schemas exported by the adjacent "spec" package -->
    <!-- TODO: Add any strings to the strings.ts file, not directly in the component -->
  </div>
</template>

<script setup lang="ts">
import { __target_name___strings as strings } from "./__TargetName__.strings.ts";
import { useReverseT } from "../../i18n.ts";
// @ts-expect-error - TODO: replace with the actual schema, use with defineModel and defineProps
import { type TODO } from "template-package-spec";

const { t } = useReverseT();

// TODO: Define props/models based on the schemas from the spec package
// interface Props {
//   // Add props here based on the schemas exported by the adjacent "spec" package
// }
// const props = defineProps<Props>();
// const model = defineModel<TODO[]>();
</script>
