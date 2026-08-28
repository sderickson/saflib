<template>
  <section
    class="mkt-feature-grid mkt-section-bleed mkt-section-pad-xl"
    :aria-labelledby="headingId"
  >
    <div class="mkt-feature-grid__inner mkt-section-inner">
      <div class="mkt-feature-grid__head mkt-copy-max">
        <p v-if="eyebrow" class="mkt-eyebrow">
          <span class="mkt-eyebrow-mark" aria-hidden="true" />
          {{ eyebrow }}
        </p>
        <h2 :id="headingId" class="mkt-feature-grid__title">
          {{ title }}
        </h2>
        <p v-if="lede" class="mkt-feature-grid__lede mkt-text-muted">
          {{ lede }}
        </p>
      </div>

      <div class="mkt-feature-grid__items">
        <article
          v-for="(item, index) in items"
          :key="index"
          class="mkt-feature-grid__card"
        >
          <div class="mkt-feature-grid__card-num">
            {{ String(index + 1).padStart(2, "0") }}
          </div>
          <h3 class="mkt-feature-grid__card-title">{{ item.title }}</h3>
          <p class="mkt-feature-grid__card-body mkt-text-subtle">
            {{ item.body }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useId } from "vue";

defineProps<{
  eyebrow?: string;
  title: string;
  lede?: string;
  items: Array<{ title: string; body: string }>;
}>();

const headingId = `marketing-feature-grid-${useId().replace(/:/g, "")}`;
</script>

<style scoped>
.mkt-feature-grid {
  background: rgb(var(--v-theme-surface-bright, 245, 245, 245));
}

.mkt-feature-grid__head {
  margin: 0 0 clamp(2rem, 4vw, 3rem) 0;
}

.mkt-feature-grid__title {
  color: rgb(var(--v-theme-on-surface));
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  margin: 0 0 1rem 0;
  text-wrap: balance;
}

.mkt-feature-grid__lede {
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.6;
}

.mkt-feature-grid__items {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background: rgba(var(--v-theme-on-surface), 0.12);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

@media (min-width: 600px) {
  .mkt-feature-grid__items {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .mkt-feature-grid__items {
    grid-template-columns: repeat(3, 1fr);
  }
}

.mkt-feature-grid__card {
  background: rgb(var(--v-theme-surface));
  padding: clamp(1.75rem, 3vw, 2.5rem);
  transition: background 0.2s ease;
  display: flex;
  flex-direction: column;
}

.mkt-feature-grid__card:hover {
  background: rgb(var(--v-theme-surface-bright, 250, 250, 250));
}

.mkt-feature-grid__card-num {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.1em;
  margin-bottom: 1.5rem;
}

.mkt-feature-grid__card-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
}

.mkt-feature-grid__card-body {
  margin: 0;
  line-height: 1.6;
}
</style>
