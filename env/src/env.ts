import {
  buildMonorepoContext,
  getCurrentPackageName,
  getAllPackageWorkspaceDependencies,
} from "@saflib/dev-tools";

export const getCombinedEnvSchema = () => {
  const context = buildMonorepoContext();
  console.log("got context", Object.keys(context));
  console.log("root dir", context.rootDir);

  const currentPackageName = getCurrentPackageName();
  console.log("current package name", currentPackageName);

  const allDependencies = getAllPackageWorkspaceDependencies(
    currentPackageName,
    context,
  );
  console.log("all dependencies", allDependencies);
};
