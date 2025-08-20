#!/usr/bin/env node
import { startIdentityService } from "../index.ts";

startIdentityService({
  dbOptions: {
    onDisk: true,
  },
});
