import { useKratosSession } from "@saflib/ory-kratos-sdk";

export function useVerifyWallLoader() {
  return {
    sessionQuery: useKratosSession(),
  };
}
