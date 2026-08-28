<template>
  <v-app>
    <v-app-bar density="compact" flat border>
      <v-btn
        icon="mdi-home"
        variant="text"
        to="/"
        title="Home"
        aria-label="Home"
      />
      <v-app-bar-title class="text-body-2 font-weight-medium">
        Base Dev Site
      </v-app-bar-title>
      <v-spacer />
      <v-btn
        :variant="navActive('history') ? 'tonal' : 'text'"
        :color="navActive('history') ? 'primary' : undefined"
        to="/history"
      >
        History
      </v-btn>
      <v-btn
        :variant="navActive('checkout') ? 'tonal' : 'text'"
        :color="navActive('checkout') ? 'primary' : undefined"
        to="/checkout"
      >
        Checkout
      </v-btn>
      <v-btn
        :variant="navActive('build') ? 'tonal' : 'text'"
        :color="navActive('build') ? 'primary' : undefined"
        to="/build"
      >
        Build
      </v-btn>
    </v-app-bar>
    <v-main class="dev-site-main">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

function navActive(section: "history" | "checkout" | "build"): boolean {
  const p = route.path;
  if (section === "history") {
    return p === "/history" || p.startsWith("/history/");
  }
  if (section === "checkout") {
    return p === "/checkout" || p.startsWith("/checkout/");
  }
  return p === "/build" || p.startsWith("/build/");
}
</script>

<style>
html,
body,
#app {
  height: 100%;
  overflow: hidden;
}
.v-application {
  height: 100%;
}
.dev-site-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.dev-site-main > .v-main__wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
</style>
