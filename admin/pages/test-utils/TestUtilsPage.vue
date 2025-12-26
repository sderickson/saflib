<template>
  <v-container>
    <h1 class="mt-b">{{ t(strings.title) }}</h1>
    <v-row>
      <v-col cols="auto">
        <v-btn color="primary" @click="enterTestMode">
          {{ t(strings.enterTestMode) }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { test_utils_page as strings } from "./TestUtilsPage.strings";
import { setTestMode } from "@saflib/vue";
import { useReverseT } from "../../i18n";

const { t } = useReverseT();

const enterTestMode = () => {
  setTestMode("e2e");
};
</script>
