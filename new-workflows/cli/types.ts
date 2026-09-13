import type { Command } from "commander";
import type { DbKey } from "@saflib/drizzle";
import type { WorkflowDefinition } from "@saflib/new-workflows";

export interface CliContext {
  program: Command;
  registry: WorkflowDefinition<any, any>[];
  dbKey: DbKey;
}
