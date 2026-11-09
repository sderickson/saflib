/**
 * The workspace alignment check lives with `saf-monorepo lock-prune`, which
 * runs it as part of every check. Re-exported here by relative path because
 * the dev stack's `deps` service runs it before node_modules exists (so
 * `@saflib/monorepo` can't be resolved by package name yet).
 */
export * from "../../monorepo/src/lock-prune/workspace-alignment.ts";
