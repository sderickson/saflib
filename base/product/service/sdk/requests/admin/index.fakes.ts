import { getUsersByIdAdminHandler } from "./users-by-id.fake.ts";

// export all fake handlers for this group
export const adminFakeHandlers = [
  getUsersByIdAdminHandler,
  // BEGIN WORKFLOW AREA fake-handler-array FOR sdk/add-query

  // END WORKFLOW AREA

  // BEGIN WORKFLOW AREA mutation-handler-array FOR sdk/add-mutation

  // END WORKFLOW AREA
];
