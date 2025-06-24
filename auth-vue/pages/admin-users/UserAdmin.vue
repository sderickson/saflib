<template>
  <v-container>
    <h1>Users</h1>

    <div v-if="isLoading" class="text-center">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <p>Loading users...</p>
    </div>

    <v-alert v-else-if="isError" type="error" density="compact" class="mb-4">
      <p>Failed to load users:</p>
    </v-alert>

    <UserList v-else :users="data" />
  </v-container>
</template>

<script setup lang="ts">
import { useUsersQuery } from "@saflib/auth-vue/src/requests/users";
import UserList from "./UserList.vue";

// Users page component

const { data, isLoading, isError } = useUsersQuery();
</script>
