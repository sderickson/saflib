// TODO: replace with actual queries this page will need on load
import { useKratosSession } from "@saflib/ory-kratos-sdk";

export function use__TargetName__Loader() {
  // TODO: Add tanstack query calls here and return each query result in the array
  return {
    sessionQuery: useKratosSession(),
  };
}
