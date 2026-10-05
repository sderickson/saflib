/**
 * Every workflow subprocess (agent CLIs, `command`/`npm-script` steps) runs
 * dev tooling directly against the checkout — typecheck, test, `npm
 * install`, git — and must never inherit a host process's own
 * `NODE_ENV=production` (e.g. dev-site-http sets that for its own hardening,
 * unrelated to the semantics of code a workflow runs on its behalf).
 *
 * This isn't cosmetic: `npm install` under `NODE_ENV=production` silently
 * skips devDependencies. When the workflow's cwd is a bind-mounted, *live*
 * checkout also used elsewhere (e.g. dev-site's own container mounts the
 * same tree the host does), an agent innocently running `npm install` to
 * fix a missing package can strip devDependencies from `node_modules` for
 * everyone else using that checkout, not just itself.
 */
export function subprocessEnv(): NodeJS.ProcessEnv {
  const { NODE_ENV: _NODE_ENV, ...rest } = process.env;
  return rest;
}
