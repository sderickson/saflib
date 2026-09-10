<script lang="ts">
import { nested } from "./nested.ts";
export default { name: "Child", setup: () => ({ nested: nested() }) };
</script>

<template>
  <span>{{ nested }}</span>
</template>
