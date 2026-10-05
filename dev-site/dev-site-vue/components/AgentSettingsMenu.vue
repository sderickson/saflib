<template>
  <v-menu location="bottom end" :close-on-content-click="false">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        icon="mdi-cog"
        variant="text"
        title="Settings"
        aria-label="Settings"
      />
    </template>
    <v-card min-width="240" class="agent-settings-menu">
      <v-card-title class="text-body-2 font-weight-medium py-3">
        Settings
      </v-card-title>
      <v-divider />
      <v-list density="compact" nav>
        <v-list-subheader>Agent</v-list-subheader>
        <v-list-item
          v-for="option in AGENT_CLI_OPTIONS"
          :key="option.value"
          :title="option.title"
          :subtitle="option.subtitle"
          :active="agentCli === option.value"
          rounded="lg"
          @click="setAgentCli(option.value)"
        >
          <template #append>
            <v-icon
              v-if="agentCli === option.value"
              icon="mdi-check"
              size="small"
              color="primary"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { AGENT_CLI_OPTIONS, useAgentSettings } from "../agent-settings.ts";

const { agentCli, setAgentCli } = useAgentSettings();
</script>
