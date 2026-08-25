import { useKratosSession } from "@saflib/ory-kratos-sdk";

export function useHomeLoader() {
  return {
    sessionQuery: useKratosSession(),
  };
}
