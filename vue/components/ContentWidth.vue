<template>
  <v-container :fluid="variant === 'full'" class="content-width">
    <v-row justify="center">
      <v-col v-bind="colProps">
        <slot />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type ContentWidthVariant = "narrow" | "default" | "full";

const props = withDefaults(
  defineProps<{
    /** Grid width recipe. Pages own this; layout should not nest another shell. */
    variant?: ContentWidthVariant;
  }>(),
  { variant: "default" },
);

/**
 * Col spans by breakpoint. `full` is always 12; others clamp on larger screens.
 * - narrow: auth / short forms
 * - default: readable app flows (matches prior wizard shell)
 * - full: tables, logs, dense admin
 */
const COLS: Record<
  ContentWidthVariant,
  {
    cols: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  }
> = {
  narrow: { cols: 12, sm: 10, md: 8, lg: 6, xl: 4 },
  default: { cols: 12, lg: 9, xl: 6 },
  full: { cols: 12 },
};

const colProps = computed(() => COLS[props.variant]);
</script>
