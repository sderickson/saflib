<template>
  <v-container class="pa-4">
    <h1 class="mt-b">{{ t(strings.title) }}</h1>
    <v-row class="py-4">
      <v-col cols="auto">
        <v-btn color="primary" @click="enterTestMode">
          {{ t(strings.enterTestMode) }}
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-card class="pa-4">
          <v-card-title>Git Hashes</v-card-title>
          <v-table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Root</td>
                <td>{{ gitHashes.root }}</td>
              </tr>
            </tbody>
            <tbody>
              <tr>
                <td>Saflib</td>
                <td>{{ gitHashes.saflib }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { test_utils_page as strings } from "./TestUtilsPage.strings";
import { setTestMode } from "@saflib/vue";
import { useReverseT } from "../../i18n";
import { getGitHashes } from "@saflib/vue";

const gitHashes = getGitHashes();

const { t } = useReverseT();

const enterTestMode = () => {
  setTestMode("e2e");
};
</script>
