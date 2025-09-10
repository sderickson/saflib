/**
 * Functions copied from @saflib/dev-tools, so that workflows can be published independently.
 */

import { readFileSync } from "fs";
import { join } from "node:path";

export const getCurrentPackage = () => {
  const currentPackage = readFileSync(
    join(process.cwd(), "package.json"),
    "utf8"
  );
  return JSON.parse(currentPackage).name;
};
