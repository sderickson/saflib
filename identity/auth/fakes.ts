import {
  authMockConstants,
  authMockHandlers,
  authFakeScenarios,
} from "./requests/mocks.ts";

export const identityServiceFakeHandlers = [...authMockHandlers];
export const identityServiceFakeScenarios = { ...authFakeScenarios };
export const identityServiceFakeConstants = { ...authMockConstants };
