import { templateFileDbManager } from "../../instances.ts";
import { TemplateFileNotFoundError } from "../../errors.ts";
import type {
  CreateTemplateFileParams,
  TemplateFileEntity,
} from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { templateFileTable } from "../../schemas/template-file.ts";

export type TemplateFileError = TemplateFileNotFoundError;

export const templateFile = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateTemplateFileParams,
  ): Promise<ReturnsError<TemplateFileEntity, TemplateFileError>> => {
    const db = templateFileDbManager.get(dbKey)!;
    const result = await db
      .insert(templateFileTable)
      .values({
        ...params,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return {
      result: {
        id: result[0].id,
        name: result[0].name,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
      },
    };
  },
);
