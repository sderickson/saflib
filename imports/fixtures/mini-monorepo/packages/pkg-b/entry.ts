import { fromB } from "@fixture/pkg-b";
import type { PkgBType } from "@fixture/pkg-b/types";
import stripe from "stripe";

export const entry = fromB;
export type { PkgBType };
void stripe;
