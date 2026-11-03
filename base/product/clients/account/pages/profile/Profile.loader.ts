import { getMineUserConfigsQuery } from "@saflib/base-sdk/requests/user-configs/get-mine";
import { useQuery } from "@tanstack/vue-query";

export function useProfileLoader() {
  const userConfigQuery = useQuery(getMineUserConfigsQuery());

  return {
    userConfigQuery,
  };
}
