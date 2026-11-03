import { getMineUserConfigsHandler } from "./get-mine.fake.ts";
import { putMineUserConfigsHandler } from "./put-mine.fake.ts";
import { unsubscribeMarketingEmailsUserConfigsHandler } from "./unsubscribe-marketing.fake.ts";

// export all fake handlers for this group
export const userConfigsFakeHandlers = [
  getMineUserConfigsHandler,
  putMineUserConfigsHandler,
  unsubscribeMarketingEmailsUserConfigsHandler,
  // BEGIN WORKFLOW AREA fake-handler-array FOR sdk/add-query

  // END WORKFLOW AREA

  // BEGIN WORKFLOW AREA mutation-handler-array FOR sdk/add-mutation

  // END WORKFLOW AREA
];
