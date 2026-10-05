import type { DbKey } from "@saflib/drizzle";
import { appendWorkflowLog } from "@saflib/new-workflows-db";
import type { LogChunk } from "@saflib/new-workflows";
import type { Readable } from "node:stream";

const COLOR_BY_CHANNEL: Record<LogChunk["channel"], string> = {
  terminal: "\x1b[2m", // dim
  agent: "\x1b[36m", // cyan
  tool: "\x1b[32m", // green
  "agent-input": "\x1b[33m", // yellow
};
const RESET = "\x1b[0m";

function printChunk(chunk: LogChunk): void {
  const color = COLOR_BY_CHANNEL[chunk.channel];
  const prefix = `[${chunk.channel}]`;
  const stream = chunk.level === "error" ? process.stderr : process.stdout;
  for (const line of chunk.content.split("\n")) {
    if (line === "") continue;
    stream.write(`${color}${prefix} ${line}${RESET}\n`);
  }
}

/**
 * Drains a run-step's output stream: prints each chunk to the terminal
 * per-channel as it arrives, and persists it to `workflow_logs`. The CLI's
 * job, not lib's — lib only ever hands back a stream.
 */
export async function printAndPersist(
  dbKey: DbKey,
  runId: string,
  stepIndex: number,
  output: Readable,
): Promise<void> {
  for await (const chunk of output as AsyncIterable<LogChunk>) {
    printChunk(chunk);
    await appendWorkflowLog(dbKey, {
      run_id: runId,
      step_index: stepIndex,
      channel: chunk.channel,
      level: chunk.level,
      content: chunk.content,
      now: new Date(),
    });
  }
}
