import { makeLineReplace } from "@saflib/workflows";

/**
 * Like makeLineReplace, plus remaps golden `@saflib/base-*` deps that gRPC
 * templates use so `npm install` resolves workspace packages (the old
 * `template-package-db` / `template-package-service-common` workspace packages
 * were removed with the base migration).
 */
export function makeGrpcLineReplace(context: {
  sharedPackagePrefix?: string;
}) {
  const lineReplace = makeLineReplace(context);
  return (line: string) => {
    let out = line;
    if (context.sharedPackagePrefix) {
      out = out
        .split("@saflib/base-service-common")
        .join(`${context.sharedPackagePrefix}-service-common`);
      out = out
        .split("@saflib/base-db")
        .join(`${context.sharedPackagePrefix}-db`);
    }
    return lineReplace(out);
  };
}
