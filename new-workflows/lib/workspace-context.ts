/**
 * Which workspace (if any) the current advance runs in. Its own module so
 * low-level helpers (`subprocess-env.ts`) can consult it without importing
 * the sync code in `workspace.ts`.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export interface WorkspacePaths {
  /** The user's checkout, e.g. `/repo`. */
  hostRoot: string;
  /** The workspace clone, e.g. `/workspace/repo`. */
  root: string;
}

export const activeWorkspace = new AsyncLocalStorage<WorkspacePaths>();

/**
 * Maps a path under the checkout to the same path in the active workspace
 * clone. Identity when no workspace is active, or when the path is already
 * in the clone (child runs and step results store clone paths).
 */
export function toWorkspacePath(p: string): string;
export function toWorkspacePath(p: string | null | undefined): string | null | undefined;
export function toWorkspacePath(p: string | null | undefined): string | null | undefined {
  const ws = activeWorkspace.getStore();
  if (!ws || !p) return p;
  if (p === ws.hostRoot) return ws.root;
  if (p.startsWith(ws.hostRoot + "/")) return ws.root + p.slice(ws.hostRoot.length);
  return p;
}
