# Overview

The `@saflib/vue` package provides a comprehensive set of tools and workflows for creating Single Page Applications (SPAs) within SAF clients. It includes:

- Opinionated file and page structure
- Product event logging
- i18n (vue-i18n)
- Tanstack Query
- Testing utilities such as MSW

Each SPA built with `@saflib/vue` should be for a single subdomain on a website, such as example.com, auth.example.com, or app.example.com. SPAs hosted as subpaths within another subdomain are not supported. SPAs for the domain root can be called something like "root" or "landing" or some other term that's unlikely to be used as a subdomain.

## Package Structure

Each package which depends on `@saflib/vue` should have the following structure:

```
web-{subdomain}/
├── e2e/
│   ├── {user-flow-1}/
│   │   └── user-flow-1.spec.ts
│   ├── {user-flow-2}/
│   │   └── user-flow-2.spec.ts
│   └── ...
├── pages/
│   ├── {page-one}/
│   │   ├── components/
│   │   ├── PageOne.loader.ts
│   │   ├── PageOne.strings
│   │   ├── PageOne.test.ts
│   │   ├── PageOne.vue
│   │   └── PageOneAsync.vue
│   ├── {page-two}/
│   │   └── ...
│   └── ...
├── i18n.ts
├── main.ts
├── package.json
├── router.ts
├── strings.ts
├── test-app.ts
├── tsconfig.json
└── vite.config.ts
```

## Files and Directories Explained

### `e2e/`

Contains Playwright tests for this SPA. These tests are likely to test pages outside of the SPA as well (such as for logging in through an auth client, or creating a test user through an admin client). This is fine and expected; this helps ensure dependencies between clients are tested. But the tests inside a package should mainly be focused on the experiences of the package itself.

E2E tests are organized by directory because each of them is likely to produce artifacts, such as screenshots.

For more information, see [`@saflib/playwright`](../../playwright/docs/overview.md)

### `pages/`

Contains the components for each page of the SPA. Each page is expected to have:

1. The main component which handles what is displayed
2. An "async" component which uses `AsyncPage` to render a loading screen while data is fetched and code is loaded.
3. A "loader" which is used by both the main and async components to run Tanstack Queries.
4. A "strings" file which contains the default language strings for the page.
5. A test file which mainly checks the component correctly renders on page load.
6. (optional) a "components" directory for sub-components specific to this page (shared components should go in a "common" package).

For more information, see [Pages](./02-pages.md).

### `i18n.ts`

Looks something like this:

```typescript
import { makeReverseTComposable } from "@saflib/vue";
import { webLandingStrings } from "./strings.ts";
import { webCommonStrings } from "@your-org/web-common/strings.ts";

export const useReverseT = makeReverseTComposable({
  ...webLandingStrings,
  ...webCommonStrings,
});
```

Each page and component in this package should call `const { t } = useReverseT()` and use the `t` function to translate strings.

For more information, see [i18n](./03-i18n.md).

### `main.ts`

Exports a `main` function which:

1. Calls [`setClientName`](./ref/functions/setClientName.md)
2. Calls [`createVueApp`](./ref/functions/createVueApp.md)

It will look something like this:

```typescript
import { createVueApp } from "@saflib/vue";
import App from "./MyApp.vue";
import { router } from "./router";
import { setClientName } from "@saflib/vue";
import { webCommonStrings } from "@your-org/web-common/strings";
import { webMyAppStrings } from "./strings";

export const main = () => {
  setClientName("web-my-app");
  createVueApp(App, {
    router,
    i18nMessages: {
      ...webMyAppStrings,
      ...webCommonStrings,
    },
  });
};
```

This function is exported by the package as the main entrypoint and used by a "spas" package to build all SPAs together.

### `router.ts`

Defines routes, then creates a [Vue Router](https://router.vuejs.org/) instance and exports it to be used in `main.ts`.

### `strings.ts`

Imports and re-exports all `strings` files in the package. This is both used by `main.ts` for [Vue I18n](https://vue-i18n.intlify.dev/), and exported by the package at the `"./strings"` entrypoint for use by other packages. Strings are kept separate from the rest of the package so they don't inadvertently depend on Vue and the necessary build systems. Then runners like Playwright don't need to support all that.

### `test-app.ts`

Exports a `mountTestApp` function which wraps and extends Vue Test Utils' [`mount`](https://test-utils.vuejs.org/api/#mount) function. This function can let

# Setup

This guide outlines the steps required to create a new SPA within the TaskTap architecture. Follow these steps to ensure all necessary configurations are properly set up.

## 1. Create the Basic Directory Structure

Start by creating the necessary directory structure for your new SPA:

```bash
mkdir -p clients/your-app-name/pages
```

## 2. Create Essential Files

### 2.1. Main Application Component (`YourAppName.vue`)

Create the main application component:

```vue
<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
// YourAppName.vue - Main app component
</script>
```

### 2.2. Entry Point (`main.ts`)

Create the main entry point file with all necessary plugins:

```typescript
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/lib/styles/main.css";

import { createApp } from "vue";
import App from "./YourAppName.vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import router from "./router.ts";
import { VueQueryPlugin } from "@tanstack/vue-query";

const vuetify = createVuetify({
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: "light",
  },
});

const app = createApp(App);
app.use(vuetify);
app.use(router);
app.use(VueQueryPlugin);
app.mount("#app");
```

### 2.3. HTML Entry Point (`index.html`)

Create the HTML entry point:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your App Title</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/your-app-name/main.ts"></script>
  </body>
</html>
```

### 2.4. Router Configuration (`router.ts`)

Create the router configuration:

```typescript
import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    component: () => import("./pages/HomePage.vue"),
  },
  // Add more routes as needed
];

const router = createRouter({
  history: createWebHistory("/your-app-name"),
  routes,
});

export default router;
```

## 3. Update Vite Configuration

Update the Vite configuration in `clients/vite.config.ts` to include your new app:

### 3.1. Add to Input Configuration

Add your app to the input configuration in the rollup options:

```typescript
input: {
  app: path.resolve(__dirname, "app/index.html"),
  auth: path.resolve(__dirname, "auth/index.html"),
  landing: path.resolve(__dirname, "index.html"),
  "your-app-name": path.resolve(__dirname, "your-app-name/index.html"),
},
```

### 3.2. Add Proxy Configuration

Add proxy configuration for your app:

```typescript
"^/your-app-name/[^\\.]+$": {
  rewrite: () => "http://localhost:5173/your-app-name/",
  target: "http://localhost:5173",
  configure: proxyLogger,
},
```

### 3.3. Update the Exclusion Pattern

Update the exclusion pattern in the catch-all proxy rule to include your app:

```typescript
"^/(?!(?:@|auth/|app/|your-app-name/))[^.]+$": {
  rewrite: () => "http://localhost:5173/",
  target: "http://localhost:5173",
  configure: proxyLogger,
},
```

## 4. Create Page Components

Create your page components in the `pages` directory. Each page should be a Vue component that can be imported by the router.

## 5. Testing Your New App

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Navigate to your new app at:
   ```
   http://localhost:5173/your-app-name/
   ```

## Common Issues and Troubleshooting

### Import Errors

If you encounter import errors:

1. Make sure all import paths are correct
2. Check that you're using the correct file extensions in imports
3. Restart your IDE

### Routing Issues

If routes aren't working correctly:

1. Check that the base path in the router configuration matches your app name
2. Ensure that the proxy configuration in vite.config.ts is correct
3. Verify that all router.push calls use the correct paths
4. Links to other apps need to become anchor tags, rather than vue router links.

## Conclusion

Following these steps should result in a fully functional SPA within the SAF architecture. Remember to adapt these instructions based on the specific requirements of your new app.
