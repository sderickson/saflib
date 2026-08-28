<template>
  <section
    class="mkt-hero mkt-section-bleed"
    :class="{ 'mkt-hero--compact': variant === 'compact' }"
    aria-labelledby="marketing-hero-title"
  >
    <div class="mkt-hero__scrim" aria-hidden="true" />

    <div class="mkt-hero__inner">
      <p v-if="eyebrow" class="mkt-hero__eyebrow mkt-eyebrow">
        <span class="mkt-eyebrow-mark" aria-hidden="true" />
        {{ eyebrow }}
      </p>

      <h1 id="marketing-hero-title" class="mkt-hero__title">
        {{ title }}
      </h1>

      <p v-if="subtitle" class="mkt-hero__subtitle mkt-lede-max">
        {{ subtitle }}
      </p>

      <div class="mkt-hero__actions d-flex flex-wrap ga-3">
        <v-btn
          v-if="mounted && resolvedCtaHref"
          color="primary"
          variant="flat"
          size="x-large"
          rounded="0"
          class="mkt-hero__btn mkt-btn-industrial"
          :href="resolvedCtaHref"
        >
          {{ ctaLabel ?? "Get started" }}
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
          class="mkt-hero__btn mkt-btn-industrial mkt-btn-ghost-on-dark"
          :href="secondaryHref"
        >
          {{ secondaryLabel ?? "Learn more" }}
        </v-btn>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    eyebrow?: string;
    ctaLabel?: string;
    ctaHref?: string;
    secondaryHref?: string;
    secondaryLabel?: string;
    variant?: "default" | "compact";
  }>(),
  { variant: "default" },
);

const defaultCtaHref = linkToHrefWithHost(authLinks.newRegistration);
const resolvedCtaHref = computed(() => props.ctaHref ?? defaultCtaHref);

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
</script>

<style scoped>
.mkt-hero {
  position: relative;
  isolation: isolate;
  color: #fff;
  background: rgb(var(--v-theme-surface-variant, 33, 33, 33));
  overflow: hidden;
  min-height: clamp(24rem, 62vh, 40rem);
  display: flex;
  align-items: center;
}

.mkt-hero--compact {
  min-height: clamp(18rem, 42vh, 26rem);
}

.mkt-hero__scrim {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    linear-gradient(
      135deg,
      rgba(var(--v-theme-primary), 0.92) 0%,
      rgba(var(--v-theme-primary), 0.55) 45%,
      rgba(20, 24, 32, 0.88) 100%
    ),
    linear-gradient(
      180deg,
      rgba(10, 16, 24, 0.15) 0%,
      rgba(10, 16, 24, 0.65) 100%
    );
}

.mkt-hero__inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding: clamp(3rem, 8vw, 6rem) clamp(1.5rem, 5vw, 4rem);
}

.mkt-hero__eyebrow {
  color: rgba(255, 255, 255, 0.92);
}

.mkt-hero__title {
  font-weight: 700;
  font-size: clamp(2rem, 5vw, 3.75rem);
  line-height: 1.05;
  letter-spacing: -0.01em;
  margin: 0 0 1.25rem 0;
  max-width: 22ch;
  text-wrap: balance;
}

.mkt-hero__subtitle {
  font-size: clamp(1rem, 1.4vw, 1.25rem);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 2rem 0;
}

.mkt-hero__btn {
  padding-inline: 1.75rem !important;
}

@media (max-width: 599px) {
  .mkt-hero__btn {
    width: 100%;
    height: 52px !important;
  }
}
</style>
