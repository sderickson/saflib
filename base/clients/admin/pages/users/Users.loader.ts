import { getUsersByIdAdminQuery } from "@saflib/base-sdk/requests/admin/users-by-id";
import { useQuery } from "@tanstack/vue-query";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

export function useUsersLoader() {
  const route = useRoute();
  const userId = ref("");

  watch(
    () => route.query.id,
    (id) => {
      userId.value = typeof id === "string" ? id : "";
    },
    { immediate: true },
  );

  const userQuery = useQuery(getUsersByIdAdminQuery(userId));

  return { userQuery };
}
