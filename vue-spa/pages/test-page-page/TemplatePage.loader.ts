import { useUsersQuery } from "@saflib/auth-vue";

export function useTemplatePageLoader() {
  // Add tanstack query calls here and return each query result in the array
  return {
    usersQuery: useUsersQuery(),
  };
}
