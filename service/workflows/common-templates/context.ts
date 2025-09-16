import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { templateFileDb } from "@template/file-db";

export interface TemplateFileServiceContext {
  templateFileDbKey: DbKey;
}

export const templateFileServiceStorage =
  new AsyncLocalStorage<TemplateFileServiceContext>();

export interface TemplateFileServiceContextOptions {
  templateFileDbKey?: DbKey;
}

export const makeContext = (
  options: TemplateFileServiceContextOptions = {},
): TemplateFileServiceContext => {
  const dbKey = options.templateFileDbKey ?? templateFileDb.connect();
  return {
    templateFileDbKey: dbKey,
  };
};
