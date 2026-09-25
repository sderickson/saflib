export {};

declare module "@saflib/base-db/instances" {
  export const __serviceName__Db: {
    connect: () => import("@saflib/drizzle").DbKey;
  };
}

declare module "@saflib/base-service-common/context" {
  export const __serviceName__ServiceStorage: import("node:async_hooks").AsyncLocalStorage<unknown>;

  export interface __ServiceName__ServiceContextOptions {
    __serviceName__DbKey?: import("@saflib/drizzle").DbKey;
  }
}
