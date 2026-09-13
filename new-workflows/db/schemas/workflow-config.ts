import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import type { WorkflowConfigBody } from "@saflib/new-workflows-spec";

export type { WorkflowConfigBody };

export interface WorkflowConfigEntity {
  id: string;
  name: string;
  config: WorkflowConfigBody;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export const workflowConfigTable = sqliteTable("workflow_config", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateShortId()),
  name: text("name").notNull(),
  config: text("config", { mode: "json" })
    .$type<WorkflowConfigBody>()
    .notNull(),
  created_by: text("created_by").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type WorkflowConfigEntityTest = Expect<
  Equal<WorkflowConfigEntity, typeof workflowConfigTable.$inferSelect>
>;
