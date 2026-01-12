import { identityServiceFakeHandlers } from "@saflib/auth/fakes";

// BEGIN SORTED WORKFLOW AREA fake-group-imports FOR sdk/add-query
import { __groupName__FakeHandlers } from "./requests/__group-name__/index.fakes.ts";
// END WORKFLOW AREA

export const __serviceName__ServiceFakeHandlers = [
  ...identityServiceFakeHandlers,
  // BEGIN SORTED WORKFLOW AREA fake-group-handlers FOR sdk/add-query
  ...__groupName__FakeHandlers,
  // END WORKFLOW AREA
];
