<script setup lang="ts">
import { helper } from "./helper.ts";
import Child from "./Child.vue";

const label = helper();
</script>

<template>
  <div>{{ label }}<Child /></div>
</template>
