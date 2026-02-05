// BEGIN SORTED WORKFLOW AREA fake-handler-imports FOR sdk/add-query sdk/add-mutation
import { __queryName____GroupName__Handler } from "./__query-name__.fake.ts";
// END WORKFLOW AREA

// BEGIN SORTED WORKFLOW AREA mutation-handler-imports FOR sdk/add-mutation
import { __mutationName____GroupName__Handler } from "./__mutation-name__.fake.ts";
// END WORKFLOW AREA

// export all fake handlers for this group
export const __groupName__FakeHandlers = [
  // BEGIN SORTED WORKFLOW AREA fake-handler-array FOR sdk/add-query
  __queryName____GroupName__Handler,
  // END WORKFLOW AREA

  // BEGIN SORTED WORKFLOW AREA mutation-handler-array FOR sdk/add-mutation
  __mutationName____GroupName__Handler,
  // END WORKFLOW AREA
];
