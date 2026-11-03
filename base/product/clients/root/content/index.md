<Hero
  eyebrow="Base platform"
  title="Build and ship with a shared foundation."
  subtitle="Base is the reference implementation for SafLib web clients — authentication, layouts, analytics, and static marketing sites that share one design system."
  cta-label="Create account"
  secondary-href="/about"
  secondary-label="Learn more"
/>

<Blurb
  super-title="What we do"
  header="One stack for apps and marketing sites."
  :content="[
    'Static sites compose pages from reusable marketing components in markdown, while SPAs share the same layout, auth, and Vuetify theme.',
    'Develop locally with Docker Compose, then deploy the same images to production without reworking your client structure.',
  ]"
  :bullets="[
    'Shared BaseLayout for static sites and Vue apps',
    'Ory Kratos auth flows wired through common links',
    'VitePress pages as markdown with Vue section components',
  ]"
  theme="tinted"
/>

<FeatureGrid
  eyebrow="Capabilities"
  title="Everything a product client needs out of the box."
  lede="Base packages the patterns we use across SafLib products so new clients start from working defaults instead of blank repos."
  :items="[
    {
      title: 'Static marketing sites',
      body: 'VitePress with shared Hero, Blurb, FeatureGrid, and CTA components registered automatically for markdown pages.',
    },
    {
      title: 'Authenticated apps',
      body: 'Account, admin, and app SPAs share BaseLayout, session handling, and error boundaries.',
    },
    {
      title: 'Local dev stack',
      body: 'Docker Compose builds monolith, client bundles, and static sites together for a realistic local environment.',
    },
    {
      title: 'Design system',
      body: 'Vuetify with SVG MDI icons and common strings keep look-and-feel consistent across subdomains.',
    },
    {
      title: 'Auth integration',
      body: 'Registration, verification, recovery, and login flows connect to Ory Kratos with typed SDK links.',
    },
    {
      title: 'Workflow scaffolding',
      body: 'Add new static subdomains from templates that inherit the same marketing component library.',
    },
  ]"
/>

<CtaBand
  eyebrow="Get started"
  title="Try Base locally today."
  subtitle="Run the dev stack, create an account, and explore the shared client patterns this repo demonstrates."
  cta-label="Sign up"
  secondary-label="Sign in"
/>
