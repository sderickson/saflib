# Adding a New Single Page Application (SPA)

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
