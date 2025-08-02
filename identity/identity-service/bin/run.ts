#!/usr/bin/env node
import { startAuthService } from "../index.ts";

startAuthService({
  dbOptions: {
    onDisk: true,
  },
});
