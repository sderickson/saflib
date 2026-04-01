<template>
  <v-container>
    <h1>{{ t(strings.title) }}</h1>
    <v-text-field v-bind="t(strings.example_input)"></v-text-field>
    <i18n-t
      v-if="identity"
      scope="global"
      :keypath="lookupTKey(strings.logged_in_with_email)"
    >
      <template #email>{{ identity.traits.email }}</template>
    </i18n-t>
    <div v-else>{{ t(strings.not_logged_in) }}</div>
  </v-container>
</template>

<script setup lang="ts">
import type { Identity } from "@ory/client";
import { __full_name__ as strings } from "./__TargetName__.strings.ts";
import { use__TargetName__Loader } from "./__TargetName__.loader.ts";
import { useReverseT } from "template-package-spa/i18n";

const { t, lookupTKey } = useReverseT();

const { sessionQuery } = use__TargetName__Loader();

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
let identity: Identity | undefined;
if (sessionQuery.data.value?.identity) {
  identity = sessionQuery.data.value.identity;
}
</script>
