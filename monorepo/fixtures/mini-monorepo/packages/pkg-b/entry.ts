import { fromB } from "@fixture/pkg-b";
import type { PkgBType } from "@fixture/pkg-b/types";

export const entry = fromB;
export type { PkgBType };

/** External root for graph tests (node: built-in — no npm install needed). */
import "node:fs";
