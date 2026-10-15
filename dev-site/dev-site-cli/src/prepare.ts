import { writeClaudeCredentials, writeCursorCredentials } from "./agent-credentials.ts";
import { writeDevSiteEnv } from "./dev-site-env.ts";

/** Writes dev-site.env and agent credential placeholders for compose. */
export function prepareDevStack(devDir: string): void {
  writeDevSiteEnv(devDir);
  writeClaudeCredentials(devDir);
  writeCursorCredentials(devDir);
}
