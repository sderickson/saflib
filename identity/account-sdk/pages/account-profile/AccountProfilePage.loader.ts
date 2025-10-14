import { getProfile } from "@saflib/auth";
import { useQuery } from "@tanstack/vue-query";

export function useAccountProfilePageLoader() {
  const profileQuery = useQuery(getProfile());

  return {
    profileQuery,
  };
}
