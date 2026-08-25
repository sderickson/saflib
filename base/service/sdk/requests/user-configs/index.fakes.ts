// BEGIN WORKFLOW AREA fake-handler-imports FOR sdk/add-query
import { getMineUserConfigsHandler } from "./get-mine.fake.ts";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA mutation-handler-imports FOR sdk/add-mutation
import { putMineUserConfigsHandler } from "./put-mine.fake.ts";
import { unsubscribeMarketingEmailsUserConfigsHandler } from "./unsubscribe-marketing.fake.ts";
// END WORKFLOW AREA

// export all fake handlers for this group
export const userConfigsFakeHandlers = [
  // BEGIN WORKFLOW AREA fake-handler-array FOR sdk/add-query
  getMineUserConfigsHandler,
  // END WORKFLOW AREA

  // BEGIN WORKFLOW AREA mutation-handler-array FOR sdk/add-mutation
  putMineUserConfigsHandler,
  unsubscribeMarketingEmailsUserConfigsHandler,
  // END WORKFLOW AREA
];
