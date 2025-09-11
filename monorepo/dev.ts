import { execSync } from "child_process";

export function formatPath(path: string) {
  execSync(`npm exec saf-format ${path}`, {
    stdio: "inherit",
  });
}
