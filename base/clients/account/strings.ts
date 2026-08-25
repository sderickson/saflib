import { base_common_strings } from "@saflib/base-clients-common/strings";
import {
  profile,
  profile_form,
  profile_intro,
} from "./pages/profile/Profile.strings.ts";
import { home } from "./pages/home/Home.strings.ts";
import { home_nav_list } from "./pages/home/HomeNavList.strings.ts";
import { account_settings_section } from "./pages/account-settings/AccountSettingsSection.strings.ts";

// BEGIN WORKFLOW AREA string-imports FOR vue/add-view sdk/add-component

// END WORKFLOW AREA

export const account_strings = {
  ...base_common_strings,
  // BEGIN WORKFLOW AREA string-object FOR vue/add-view sdk/add-component
  profile,
  profile_intro,
  profile_form,
  home,
  home_nav_list,
  account_settings_section,
  // END WORKFLOW AREA
};
