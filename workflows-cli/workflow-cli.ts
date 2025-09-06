#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { runWorkflowCli } from "@saflib/workflows-internal";
import { workflows } from "./list.ts";

runWorkflowCli(workflows);
