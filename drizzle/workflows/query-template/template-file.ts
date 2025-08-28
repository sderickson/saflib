// @ts-nocheck - TODO remove this line as part of workflow
import { someDbManager } from "../../instances.ts";
import { SomeError } from "../../errors.ts";
import type { SomeDbType } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";

export type TemplateFileError = SomeError;

export const templateFile = queryWrapper(
  async (
    dbKey: DbKey,
    params: SomeDbType,
  ): Promise<ReturnsError<SomeDbType, TemplateFileError>> => {
    const db = someDbManager.get(dbKey);
    return { result: {} };
  },
);
