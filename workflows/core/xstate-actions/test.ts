import { getCurrentPackage } from "../../workspace.ts";
import { runCommandAsync } from "./utils.ts";

// test action

const getTestCommandAndArgs = () => {
  let command = "npm";
  let args = ["test"];

  // prevent infinite loop
  if (getCurrentPackage() === "@saflib/workflows-internal") {
    command = "ls";
    args = [];
  }
  return { command, args };
};

export const doesTestPass = (pathString: string) => {
  const { command, args } = getTestCommandAndArgs();
  return runCommandAsync(command, [...args, pathString]);
};
