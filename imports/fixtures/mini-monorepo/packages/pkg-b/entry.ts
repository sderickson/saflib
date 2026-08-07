import { fromB } from "@fixture/pkg-b";
import type { PkgBType } from "@fixture/pkg-b/types";

export const entry = fromB;
export type { PkgBType };

/** External npm root for graph tests (no stripe package in the fixture). */
export const loadStripe = (): Promise<unknown> => import("stripe");
