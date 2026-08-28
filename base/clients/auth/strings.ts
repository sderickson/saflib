import { auth_strings as kratos_auth_strings } from "@saflib/ory-kratos-spa/strings";
import { base_common_strings } from "@saflib/base-clients-common/strings";
import { dev_signup } from "./DevSignupAdminHint.strings.ts";

// BEGIN WORKFLOW AREA string-imports FOR vue/add-view sdk/add-component

// END WORKFLOW AREA

export const auth_strings = {
  ...base_common_strings,
  ...kratos_auth_strings,
  dev_signup,
  // BEGIN WORKFLOW AREA string-object FOR vue/add-view sdk/add-component

  // END WORKFLOW AREA
};
