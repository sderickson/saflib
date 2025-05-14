import { addNewLinesToString } from "../src/utils.ts";
import { readFileSync } from "fs";
import { join } from "path";
import { spawn, spawnSync } from "child_process";

export const print = (msg: string, noNewLine = false) => {
  if (!noNewLine) {
    console.log("");
  }
  console.log(addNewLinesToString(msg));
};

const getCurrentPackage = () => {
  const currentPackage = readFileSync(
    join(process.cwd(), "package.json"),
    "utf8",
  );
  return JSON.parse(currentPackage).name;
};

const getTestCommandAndArgs = () => {
  let command = "npm";
  let args = ["test"];

  // prevent infinite loop
  if (getCurrentPackage() === "@saflib/workflows") {
    command = "ls";
    args = [];
  }
  return { command, args };
};

export const doTestsPass = async () => {
  const { command, args } = getTestCommandAndArgs();
  let resolve: (value: string) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<string>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  const child = spawn(command, args);
  child.on("close", (code) => {
    if (code === 0) {
      resolve("Tests passed");
    } else {
      reject(new Error("Tests failed"));
    }
  });
  return promise;
};

export const doTestsPassSync = () => {
  const { command, args } = getTestCommandAndArgs();
  const { status } = spawnSync(command, args);
  return status === 0;
};
