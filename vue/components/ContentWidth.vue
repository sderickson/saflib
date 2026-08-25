<template>
  <v-container :fluid="fluid" class="content-width">
    <v-row justify="center">
      <v-col v-bind="colProps">
        <slot />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type ContentWidthVariant = "narrow" | "medium" | "wide" | "full";

const props = withDefaults(
  defineProps<{
    /** Grid width recipe. Pages own this; layout should not nest another shell. */
    variant?: ContentWidthVariant;
  }>(),
  { variant: "wide" },
);

/**
 * Col spans by breakpoint. Pages pick one recipe; layout should not nest another shell.
 * - narrow: centered forms
 * - medium: readable flows (wizard)
 * - wide: standard v-container width (component default)
 * - full: fluid edge-to-edge
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
  narrow: { cols: 12, sm: 10, md: 8, lg: 6, xl: 4, xxl: 3 },
  medium: { cols: 12, lg: 9, xl: 6 },
  wide: { cols: 12 },
  full: { cols: 12 },
};

const colProps = computed(() => COLS[props.variant]);

const fluid = computed(() => props.variant === "full");
</script>
