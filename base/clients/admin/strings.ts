import { base_common_strings } from "@saflib/base-clients-common/strings";

// BEGIN WORKFLOW AREA string-imports FOR vue/add-view sdk/add-component

import { home } from "./pages/home/Home.strings.ts";
import { users } from "./pages/users/Users.strings.ts";
// END WORKFLOW AREA

export const admin_strings = {
  ...base_common_strings,
  // BEGIN WORKFLOW AREA string-object FOR vue/add-view sdk/add-component

  home,
  users,
  // END WORKFLOW AREA
};
