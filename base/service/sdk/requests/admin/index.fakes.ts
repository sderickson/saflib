// BEGIN WORKFLOW AREA fake-handler-imports FOR sdk/add-query
import { getUsersByIdAdminHandler } from "./users-by-id.fake.ts";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA mutation-handler-imports FOR sdk/add-mutation

// END WORKFLOW AREA

// export all fake handlers for this group
export const adminFakeHandlers = [
  // BEGIN WORKFLOW AREA fake-handler-array FOR sdk/add-query
  getUsersByIdAdminHandler,
  // END WORKFLOW AREA

  // BEGIN WORKFLOW AREA mutation-handler-array FOR sdk/add-mutation

  // END WORKFLOW AREA
];
