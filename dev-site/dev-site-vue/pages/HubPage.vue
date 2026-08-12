<template>
  <v-container class="hub py-12">
    <div class="hub-brand text-center mb-10">
      <h1 class="text-h3 mb-2">Dev-site</h1>
      <p class="text-body-1 text-medium-emphasis">
        Map your product’s code — past, present, and what’s next.
      </p>
    </div>

    <v-row justify="center" class="hub-ctas">
      <v-col cols="12" md="4">
        <v-btn
          block
          size="x-large"
          variant="outlined"
          height="120"
          :to="historyPath"
          class="hub-cta"
        >
          <div class="text-left w-100 px-2">
            <div class="text-overline">Past</div>
            <div class="text-h6">History</div>
            <div class="text-caption text-medium-emphasis">
              Analyzed commits over time
            </div>
          </div>
        </v-btn>
      </v-col>
      <v-col cols="12" md="4">
        <v-btn
          block
          size="x-large"
          color="primary"
          height="120"
          :to="checkoutPath"
          class="hub-cta"
        >
          <div class="text-left w-100 px-2">
            <div class="text-overline">Present</div>
            <div class="text-h6">Current checkout</div>
            <div class="text-caption">
              Packages and tests at HEAD
            </div>
          </div>
        </v-btn>
      </v-col>
      <v-col cols="12" md="4">
        <v-btn
          block
          size="x-large"
          variant="outlined"
          height="120"
          :to="buildPath"
          class="hub-cta"
        >
          <div class="text-left w-100 px-2">
            <div class="text-overline">Future</div>
            <div class="text-h6">Build</div>
            <div class="text-caption text-medium-emphasis">
              Coming soon — gaps and next work
            </div>
          </div>
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    historyPath?: string;
    checkoutPath?: string;
    buildPath?: string;
  }>(),
  {
    historyPath: "/history",
    checkoutPath: "/checkout",
    buildPath: "/build",
  },
);
</script>

<style scoped>
.hub-cta {
  justify-content: flex-start;
  text-transform: none;
  letter-spacing: normal;
}
</style>
