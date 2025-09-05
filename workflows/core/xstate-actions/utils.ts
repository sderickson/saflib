import { spawn } from "child_process";

export const runCommandAsync = (command: string, args: string[]) => {
  let resolve: (value: string) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<string>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  const child = spawn(command, args, { stdio: "inherit" });
  child.on("close", (code) => {
    if (code === 0) {
      resolve("Tests passed");
    } else {
      reject(new Error("Tests failed"));
    }
  });
  return promise;
};
