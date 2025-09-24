// TODO: replace with actual queries this page will need on load
import { getProfile } from "@saflib/auth";
import { useQuery } from "@tanstack/vue-query";

export function use__TargetName__Loader() {
  // TODO: Add tanstack query calls here and return each query result in the array
  return {
    profileQuery: useQuery(getProfile()),
  };
}
