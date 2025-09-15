import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
// import { templateFile } from "@your-org/template-file-db";

export interface ApiServiceContext {
  templateFileDbKey: DbKey;
}

export const templateFileServiceStorage =
  new AsyncLocalStorage<ApiServiceContext>();

export interface MakeContextOptions {
  templateFileDbKey?: DbKey;
}

// TODO: Uncomment this and make sure it's correct
// export const makeContext = (
//   options: MakeContextOptions = {},
// ): ApiServiceContext => {
//   const dbKey = options.templateFileDbKey ?? templateFileDb.connect();
//   return {
//     templateFileDbKey: dbKey,
//   };
// };
