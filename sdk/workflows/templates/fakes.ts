import { identityServiceFakeHandlers } from "@saflib/auth/fakes";

// BEGIN SORTED WORKFLOW AREA fake-group-imports FOR sdk/add-query sdk/add-mutation
import { __groupName__FakeHandlers } from "./requests/__group-name__/index.fakes.ts";
// END WORKFLOW AREA

// BEGIN SORTED WORKFLOW AREA import-mocks FOR sdk/add-query sdk/add-mutation
import { resetMocks as __groupName__ResetMocks } from "./requests/__group-name__/mocks.ts";
// END WORKFLOW AREA

// BEGIN SORTED WORKFLOW AREA mock-data-exports FOR sdk/add-query sdk/add-mutation
export * from "./requests/__group-name__/mocks.ts";
// END WORKFLOW AREA

export const __serviceName__ServiceFakeHandlers = [
  ...identityServiceFakeHandlers,
  // BEGIN SORTED WORKFLOW AREA fake-group-handlers FOR sdk/add-query sdk/add-mutation
  ...__groupName__FakeHandlers,
  // END WORKFLOW AREA
];


export const resetMocks = () => {
  // BEGIN SORTED WORKFLOW AREA export-mocks FOR sdk/add-query sdk/add-mutation
  __groupName__ResetMocks();
  // END WORKFLOW AREA
};