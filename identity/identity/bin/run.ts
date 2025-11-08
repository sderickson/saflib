#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { startIdentityService } from "../index.ts";

startIdentityService({
  dbOptions: {
    onDisk: true,
  },
});
