import { useUsersQuery } from "@saflib/identity-vue";

export function useHomePageLoader() {
  // Add tanstack query calls here and return each query result in the array
  return {
    usersQuery: useUsersQuery(),
  };
}
