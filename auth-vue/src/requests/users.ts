import { useQuery } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthResponse } from "@saflib/auth-spec";

// Query key
const usersQueryKey = ["auth", "users"]; // Prefix with 'auth' for clarity

// Query function
const fetchUsers = async (): Promise<AuthResponse["listUsers"][200]> => {
  // Use the client from `@saflib/auth-vue` which uses `auth-spec` paths
  const response = await client.GET("/users"); // Path relative to auth service

  if (response.error) {
    // Handle potential errors based on the structure of createSafClient response
    throw new Error(`Failed to fetch users`); // Or handle specific error types
  }

  // Assuming response.data contains the array if successful
  return response.data;
};

// TanStack Query hook
export const useUsersQuery = () => {
  return useQuery<AuthResponse["listUsers"][200], Error>({
    queryKey: usersQueryKey,
    queryFn: fetchUsers,
    // Add options like staleTime, gcTime if needed
  });
};
