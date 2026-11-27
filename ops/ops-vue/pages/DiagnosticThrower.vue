<template><span /></template>

<script setup lang="ts">
// Throws while setting up, so Vue's app errorHandler reports it like any
// component error. Mounted only for the client-vue probe.
const props = defineProps<{ message: string }>();
throw new Error(props.message);
</script>
