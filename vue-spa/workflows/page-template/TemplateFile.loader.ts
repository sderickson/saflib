// TODO: replace with actual queries this page will need on load
import { useUsersQuery } from "@saflib/auth";

export function useTemplateFileLoader() {
  // TODO: Add tanstack query calls here and return each query result in the array
  return {
    usersQuery: useUsersQuery(),
  };
}
