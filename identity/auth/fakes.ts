import {
  authMockConstants,
  authMockHandlers,
  authMockScenarios,
} from "./requests/mocks.ts";

export const identityServiceFakeHandlers = [...authMockHandlers];
export const identityServiceFakeScenarios = { ...authMockScenarios };
export const identityServiceFakeConstants = { ...authMockConstants };
