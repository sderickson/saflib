<template>
  <section class="mkt-cta-band mkt-section-bleed" :aria-labelledby="headingId">
    <div class="mkt-cta-band__inner mkt-section-inner">
      <div class="mkt-cta-band__copy">
        <p v-if="eyebrow" class="mkt-eyebrow">
          <span class="mkt-eyebrow-mark" aria-hidden="true" />
          {{ eyebrow }}
        </p>
        <h2 :id="headingId" class="mkt-cta-band__title">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="mkt-cta-band__subtitle">
          {{ subtitle }}
        </p>
      </div>

      <div
        class="mkt-cta-band__actions d-flex ga-3 align-stretch flex-column flex-sm-row"
      >
        <v-btn
          v-if="mounted"
          color="primary"
          variant="flat"
          size="x-large"
          rounded="0"
          class="mkt-btn-industrial"
          :href="resolvedCtaHref"
        >
          {{ ctaLabel }}
          <template #append>
            <v-icon size="20">mdi-arrow-right</v-icon>
          </template>
        </v-btn>
        <v-btn
          v-if="secondaryHref"
          variant="outlined"
          size="x-large"
          rounded="0"
          color="white"
          class="mkt-btn-industrial mkt-btn-ghost-on-dark"
          :href="secondaryHref"
        >
          {{ secondaryLabel }}
        </v-btn>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId } from "vue";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";

const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    secondaryHref?: string;
    secondaryLabel?: string;
  }>(),
  {
    title: "Ready to get started?",
    subtitle: "Create an account and explore the Base platform.",
    ctaLabel: "Sign up",
    secondaryLabel: "Sign in",
  },
);

const defaultCtaHref = linkToHrefWithHost(authLinks.newRegistration);
const resolvedCtaHref = computed(() => props.ctaHref ?? defaultCtaHref);

const headingId = `marketing-cta-${useId().replace(/:/g, "")}`;

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
</script>

<style scoped>
.mkt-cta-band {
  color: #fff;
  background: rgb(var(--v-theme-surface-variant, 33, 33, 33));
  border-top: 4px solid rgb(var(--v-theme-primary));
  padding: clamp(3rem, 7vw, 5rem) clamp(1.25rem, 5vw, 3rem);
}

.mkt-cta-band__inner {
  display: grid;
  gap: clamp(1.5rem, 4vw, 2.5rem);
  align-items: center;
}

@media (min-width: 960px) {
  .mkt-cta-band__inner {
    grid-template-columns: 1fr auto;
  }
}

.mkt-cta-band__title {
  font-size: clamp(1.75rem, 3.5vw, 2.5rem);
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  text-wrap: balance;
}

.mkt-cta-band__subtitle {
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.88);
  max-width: 56ch;
}
</style>
