<template>
  <section
    class="mkt-blurb mkt-section-bleed mkt-section-pad-xl"
    :class="[`mkt-blurb--${theme}`, reverse ? 'mkt-blurb--reverse' : null]"
    :aria-labelledby="headingId"
  >
    <div class="mkt-blurb__inner mkt-section-inner">
      <div class="mkt-blurb__grid">
        <div class="mkt-blurb__copy">
          <p v-if="superTitle" class="mkt-blurb__eyebrow mkt-eyebrow">
            <span class="mkt-eyebrow-mark" aria-hidden="true" />
            {{ superTitle }}
          </p>
          <h2 :id="headingId" class="mkt-blurb__title">
            {{ header }}
          </h2>
          <div class="mkt-blurb__body mkt-text-muted">
            <p
              v-for="(paragraph, index) in content"
              :key="index"
              class="mkt-blurb__paragraph"
            >
              {{ paragraph }}
            </p>
          </div>
          <ul v-if="bullets?.length" class="mkt-blurb__bullets">
            <li
              v-for="(item, index) in bullets"
              :key="index"
              class="mkt-blurb__bullet d-flex align-start ga-3"
            >
              <span
                class="mkt-blurb__bullet-icon d-inline-flex align-center justify-center"
                aria-hidden="true"
              >
                <svg viewBox="0 0 16 16" width="16" height="16">
                  <path
                    d="M3.5 8.5l3 3 6-6.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="square"
                  />
                </svg>
              </span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useId } from "vue";

withDefaults(
  defineProps<{
    superTitle?: string;
    header: string;
    content: string[];
    bullets?: string[];
    theme?: "light" | "dark" | "tinted";
    reverse?: boolean;
  }>(),
  { theme: "light", reverse: false },
);

const headingId = `marketing-blurb-${useId().replace(/:/g, "")}`;
</script>

<style scoped>
.mkt-blurb--light {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.mkt-blurb--tinted {
  background: rgb(var(--v-theme-surface-bright, 245, 245, 245));
  color: rgb(var(--v-theme-on-surface));
}

.mkt-blurb--dark {
  background: rgb(var(--v-theme-surface-variant, 33, 33, 33));
  color: #fff;
}

.mkt-blurb__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(2rem, 5vw, 3.5rem);
  align-items: center;
}

@media (min-width: 960px) {
  .mkt-blurb__grid {
    grid-template-columns: minmax(0, 60ch);
  }
}

.mkt-blurb__title {
  font-size: clamp(1.75rem, 3.5vw, 2.75rem);
  line-height: 1.1;
  letter-spacing: -0.01em;
  font-weight: 700;
  margin: 0 0 1.25rem 0;
  text-wrap: balance;
}

.mkt-blurb__body {
  font-size: clamp(1rem, 1.15vw, 1.125rem);
  line-height: 1.65;
}

.mkt-blurb--dark .mkt-blurb__body {
  color: rgba(255, 255, 255, 0.85);
}

.mkt-blurb__paragraph + .mkt-blurb__paragraph {
  margin-top: 1rem;
}

.mkt-blurb__paragraph {
  margin: 0;
}

.mkt-blurb__bullets {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0 0 0;
  display: grid;
  gap: 0.625rem;
}

.mkt-blurb__bullet {
  font-size: 1rem;
  font-weight: 500;
}

.mkt-blurb__bullet-icon {
  width: 22px;
  height: 22px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
