import {
  authMockConstants,
  authMockHandlers,
  authMockScenarios,
} from "./requests/mocks.ts";

export const identityServiceMockHandlers = [...authMockHandlers];
export const identityServiceMockScenarios = { ...authMockScenarios };
export const identityServiceMockConstants = { ...authMockConstants };
