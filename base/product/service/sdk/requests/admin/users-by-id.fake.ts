import type { ResponseBody as getUsersByIdAdminResponseBody } from "@saflib/base-spec/operations/getUsersByIdAdmin";
import { baseHandler } from "#test/typed-fake.ts";
import { mockKratosIdentities } from "./mocks.ts";

export const getUsersByIdAdminHandler = baseHandler({
  verb: "get",
  path: "/admin/users/by-id",
  status: 200,
  handler: async ({
    query,
  }): Promise<getUsersByIdAdminResponseBody["getUsersByIdAdmin"][200]> => {
    const id = typeof query?.id === "string" ? query.id : "";
    const identity = mockKratosIdentities.find((u) => u.id === id);
    if (!identity) {
      throw new Error("User not found");
    }
    return { identity };
  },
});
