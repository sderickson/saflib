---
title: About Base
---

<Hero
  variant="compact"
  eyebrow="About"
  title="The reference SafLib client stack."
  subtitle="Base demonstrates how static marketing sites and authenticated Vue apps share layouts, auth, and tooling in one monorepo."
/>

<Blurb
  super-title="Structure"
  header="Markdown pages, shared components."
  :content="[
    'Marketing sections live in base/clients/common/components/marketing and are registered for every static site through enhanceStaticSiteApp.',
    'Individual pages are plain VitePress markdown files that compose Hero, Blurb, FeatureGrid, and CtaBand blocks — the same pattern used in product repos like Power Up.',
  ]"
  theme="light"
/>

<CtaBand
  title="Explore the demo home page."
  subtitle="Head back to the root site to see all marketing components composed on one page."
  cta-label="Back to home"
  cta-href="/"
/>
