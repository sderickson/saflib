import { getSafReporters } from "@saflib/node";
import { addNewLinesToString } from "@saflib/utils";

export function allChildrenSettled(snapshot: any) {
  return Object.values(snapshot.children).every(
    (child: any) => child && child.getSnapshot().status !== "active",
  );
}

export const print = (msg: string, noNewLine = false) => {
  const { log } = getSafReporters();
  if (!noNewLine) {
    log.info("");
  }
  log.info(addNewLinesToString(msg));
};
