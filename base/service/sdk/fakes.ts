// BEGIN WORKFLOW AREA fake-group-imports FOR sdk/add-query sdk/add-mutation
import { __groupName__FakeHandlers } from "./requests/__group-name__/index.fakes.ts";
import { adminFakeHandlers } from "./requests/admin/index.fakes.ts";
import { userConfigsFakeHandlers } from "./requests/user-configs/index.fakes.ts";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA offshoot-fake-imports FOR sdk/init
import { __offshootName__FakeHandlers } from "@saflib/base-__offshoot-name__-sdk/fakes";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA import-mocks FOR sdk/add-query sdk/add-mutation
import { resetMocks as __groupName__ResetMocks } from "./requests/__group-name__/mocks.ts";
import { resetMocks as adminResetMocks } from "./requests/admin/mocks.ts";
import { resetMocks as userConfigsResetMocks } from "./requests/user-configs/mocks.ts";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA mock-data-exports FOR sdk/add-query sdk/add-mutation
export * from "./requests/__group-name__/mocks.ts";
export * from "./requests/admin/mocks.ts";
export * from "./requests/user-configs/mocks.ts";
// END WORKFLOW AREA

export const baseServiceFakeHandlers = [
  // BEGIN WORKFLOW AREA fake-group-handlers FOR sdk/add-query sdk/add-mutation
  ...__groupName__FakeHandlers,
  ...adminFakeHandlers,
  ...userConfigsFakeHandlers,
  // END WORKFLOW AREA
  // BEGIN WORKFLOW AREA offshoot-fake-handlers FOR sdk/init
  ...__offshootName__FakeHandlers,
  // END WORKFLOW AREA
];

export const resetMocks = () => {
  // BEGIN WORKFLOW AREA export-mocks FOR sdk/add-query sdk/add-mutation
  __groupName__ResetMocks();
  adminResetMocks();
  userConfigsResetMocks();
  // END WORKFLOW AREA
};
