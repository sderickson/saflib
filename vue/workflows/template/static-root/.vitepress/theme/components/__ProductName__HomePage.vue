<template>
  <div class="root-home py-8">
    <v-row class="align-center mb-10" dense>
      <v-col cols="12" md="6" class="order-2 order-md-1">
        <h1 class="text-h3 text-md-h2 font-weight-medium my-8">
          __Product Name__
        </h1>
        <p class="text-h6 text-medium-emphasis font-weight-regular mb-5">
          Welcome to __Product Name__.
        </p>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.root-home :deep(a.text-primary) {
  text-decoration: none;
}
.root-home :deep(a.text-primary:hover) {
  text-decoration: underline;
}
</style>
