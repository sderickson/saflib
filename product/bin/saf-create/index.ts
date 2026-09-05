#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { setupContext } from "@saflib/commander";
import { main } from "../../create/cli.ts";

setupContext({ serviceName: "saf-create" }, () => {
  main(process.argv);
});
