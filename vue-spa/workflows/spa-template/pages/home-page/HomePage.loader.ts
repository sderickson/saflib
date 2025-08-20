import { useUsersQuery } from "@saflib/auth";

export function useHomePageLoader() {
  // Add tanstack query calls here and return each query result in the array
  return {
    usersQuery: useUsersQuery(),
  };
}
