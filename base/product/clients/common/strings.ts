import { base_layout } from "./components/base-layout/BaseLayout.strings.ts";
import { admin_layout } from "./components/admin-layout/AdminLayout.strings.ts";
import { async_page_error } from "./components/BaseAsyncPageError.strings.ts";
import { base_sdk_strings } from "@saflib/base-sdk/strings";
export const base_common_strings = {
  base_layout,
  admin_layout,
  async_page_error,
  ...base_sdk_strings,
};
