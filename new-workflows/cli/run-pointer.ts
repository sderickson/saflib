import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * The new engine's run state lives in sqlite, so the CLI only needs to
 * remember *which run id* belongs to this cwd between invocations — a CLI
 * convenience, not lib state (contrast with the old CLI's full XState
 * snapshot at `saf-workflow-status.json`).
 */
export function getRunPointerPath(cwd: string): string {
  return path.join(cwd, ".new-workflow-run.json");
}

export interface RunPointer {
  runId: string;
  /** The id or path the user originally passed to `kickoff`, so `next`/`status`/`goto` can re-resolve the same definition (a path-loaded workflow isn't in the registry). */
  idOrPath: string;
}

export function writeRunPointer(cwd: string, pointer: RunPointer): void {
  writeFileSync(getRunPointerPath(cwd), JSON.stringify(pointer, null, 2));
}

export function readRunPointer(cwd: string): RunPointer | undefined {
  const pointerPath = getRunPointerPath(cwd);
  if (!existsSync(pointerPath)) return undefined;
  return JSON.parse(readFileSync(pointerPath, "utf-8")) as RunPointer;
}
