import { createIdentityHandler } from "../typed-mock.ts";

const defaultUser = {
  id: "1",
  email: "john.doe@example.com",
  name: "John Doe",
  givenName: "John",
  familyName: "Doe",
  emailVerified: true,
};

const getProfileHandler = createIdentityHandler({
  verb: "get",
  path: "/auth/profile",
  status: 200,
  handler: async () => {
    return defaultUser;
  },
});

const getUsersHandler = createIdentityHandler({
  verb: "get",
  path: "/users",
  status: 200,
  handler: async () => {
    return [defaultUser];
  },
});

export const authMockHandlers = [getProfileHandler, getUsersHandler];
export const authMockScenarios = {
  userNotEmailVerified: [
    createIdentityHandler({
      verb: "get",
      path: "/auth/profile",
      status: 200,
      handler: async () => {
        return {
          ...defaultUser,
          emailVerified: false,
        };
      },
    }),
  ],
};

export const authMockConstants = {
  defaultUser: {
    ...defaultUser,
    emailVerified: true,
  },
};
