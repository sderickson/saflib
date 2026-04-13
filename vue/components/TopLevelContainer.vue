<template>
  <v-container>
    <v-row>
      <v-spacer v-if="smAndUp" />
      <v-col cols="12" sm="10" md="8" lg="6" xl="4" xxl="3">
        <slot></slot>
      </v-col>
      <v-spacer v-if="smAndUp" />
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";
const { smAndUp } = useDisplay();
</script>
