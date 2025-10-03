// TODO: Re-export files from the requests/ directory that contain fake implementations
// These only export the fake files, so that they're only used in tests
// This also allows the fake in-memory store to automatically refresh the data after each test

import { identityServiceFakeHandlers } from "@saflib/auth/fakes";

export const __serviceName__ServiceFakeHandlers = [
  // add fake handlers here
  ...identityServiceFakeHandlers,
];
