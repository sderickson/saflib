import { getProfile } from "@saflib/auth";
import { useQuery } from "@tanstack/vue-query";

export function useHomePageLoader() {
  return {
    profileQuery: useQuery(getProfile()),
  };
}
