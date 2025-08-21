<template>
  <v-card>
    <v-card-title>User List</v-card-title>
    <v-table density="compact">
      <thead>
        <tr>
          <th class="text-left">ID</th>
          <th class="text-left">Email</th>
          <th class="text-left">Created At</th>
          <th class="text-left">Last Login</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>
            <v-icon
              v-if="user.verifiedAt"
              icon="mdi-check-decagram"
              size="small"
            ></v-icon>
            {{ user.email }}
          </td>
          <td>{{ formatDate(user.createdAt) }}</td>
          <td>
            {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never" }}
          </td>
        </tr>
        <tr v-if="!users || users.length === 0">
          <td colspan="4" class="text-center">No users found.</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup lang="ts">
import type { AuthResponseBody } from "@saflib/identity-spec";

type User = AuthResponseBody["listUsers"][200][number];

defineProps<{
  users: User[] | null | undefined;
}>();

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Invalid Date";
  }
};
</script>
