import { spawn, type SpawnOptions } from "child_process";

type RunCommandAsyncOptions = Pick<SpawnOptions, "cwd">;

export const runCommandAsync = (
  command: string,
  args: string[],
  options: RunCommandAsyncOptions = {},
) => {
  let resolve: (value: string) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<string>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  const child = spawn(command, args, { stdio: "inherit", cwd: options.cwd });
  child.on("close", (code) => {
    if (code === 0) {
      resolve("Tests passed");
    } else {
      reject(new Error("Tests failed"));
    }
  });
  return promise;
};
