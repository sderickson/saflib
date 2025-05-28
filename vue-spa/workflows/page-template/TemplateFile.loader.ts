import { useUsersQuery } from "@saflib/auth-vue";

export function useTemplateFileLoader() {
  // Add tanstack query calls here and return each query result in the array
  return {
    usersQuery: useUsersQuery(),
  };
}
