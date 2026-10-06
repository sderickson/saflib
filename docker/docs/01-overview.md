# Overview

`@saflib/docker` generates Dockerfiles for SAF monorepos and builds images incrementally: an image is only rebuilt when something it's built from has changed.

## Builds

A **build** is a `Dockerfile.template` in a workspace package:

- `<package>/Dockerfile.template` is the package's `default` build.
- `<package>/builds/<name>/Dockerfile.template` is build `<name>`. Names can nest (`builds/prod/arm`). Use these when one package needs several images.

Each build is identified by its **build ref**, `<package-name>/builds/<name>` (for example `@saflib/base-monolith/builds/default`). CLI commands also accept a bare package name for its `default` build.

The image name is derived from the ref (`@acme/hub-monolith` → `acme-hub-monolith`, other builds append `-<name>`). An optional `build.json` next to the template can override it and add extra tags:

```json
{ "image": "acme-kratos", "tags": ["v26.2.0"] }
```

### Template markers

`saf-docker generate` (also run by `build`, `status` and `inputs`) writes each build's `Dockerfile` next to its template, replacing:

| Marker | Replaced with |
| --- | --- |
| `#{ copy_packages }#` | A `COPY` of the image's staged install manifests (see below) |
| `#{ copy_src }#` | `COPY --parents` of the package and its workspace dependencies |
| `#{ package_root }#` | `/app/<package dir>` |
| `#{ image <ref> }#` | Another build's image (`<image>:latest`). This is how a template names an **upstream** build; `saf-docker build` builds it first, and its input hash feeds this one's. |

Every generated Dockerfile ends with a **build metadata** step: the image's build info is written to `/etc/saf/build.json` and `/etc/saf/builds/<image>.json`, and upstream stages' `/etc/saf/builds/` are copied in. It is the last layer, so it never invalidates earlier ones.

### Staged install manifests

For `#{ copy_packages }#`, each image gets its own `.saf-docker/stage/<image>/`: the root `package.json` narrowed to the image's workspaces (explicit dirs, no other products' root dependencies) and a `package-lock.json` pruned to what those workspaces can reach. Another product's dependency changes therefore leave an image's install inputs untouched.

## Building

```sh
saf-docker build [refs…] [--dir <path>]… [--compose <file>]… [--platform native|amd64|arm64|os/arch]
                 [--registry <prefix>] [--push] [--force] [--dry-run] [--concurrency n]
saf-docker status …   # same selection; reports what build would do
```

Selectors combine: build refs, every build under a `--dir`, and every build whose image a `--compose` file's services use (the natural choice for dev stacks). With none, every build is selected. Upstream builds are always included. For each build, in dependency order:

1. Compute its **input hash** from everything it's built from: the git tree hashes of every path its Dockerfile copies (working tree included, so uncommitted edits count), the staged install manifests, the generated Dockerfile, its upstream builds' input hashes, and the platform.
2. If `<image>:in-<hash>` exists locally, it's **up to date**: just retag `latest`.
3. Else, with `--registry`, if the registry has it, **pull** it (or, when only publishing it, retag it remotely).
4. Else **build** it, tagged `in-<hash>`, `latest` and any `build.json` tags, with build info and OCI labels (`org.opencontainers.image.revision`, `dev.saflib.input-hash`, …).
5. With `--push`, push every tag.

Before building anything it prints the plan: every image and whether it will be built, is up to date, or is in the registry. Then each build logs when it starts and finishes. In an interactive terminal, running builds show a live progress bar each: `▒` steps BuildKit took from cache, `█` steps that actually ran, `░` the rest (of the steps reported so far), plus the current step. In CI or when piped, just the start/finish lines. Each finished build reports its step counts (`12 steps: 9 cached, 3 rebuilt`), its full log (`.saf-docker/logs/<image>.log`) and, with Docker Desktop, its build details link (`docker-desktop://…`).

Every run also writes `.saf-docker/build-report.md` (gitignored): each image's outcome, tag, time, cached/rebuilt step counts, log file and Docker Desktop link, plus any errors. The path is printed at the end. It's the place to look (or to point an agent at) after a run.

`saf-docker inputs [refs…] [-v]` prints a build's inputs and hash, and warns about gitignored files that reach the build context without being hashed (fix those with `.dockerignore`). `saf-docker skip-rate` estimates from git history how often each build would be skipped.

## Build info at runtime

`/etc/saf/build.json` records the build ref, input hash, platform, time, upstream refs, and the commits the image was **built from**: `{ root, saflib }`, suffixed `-dirty` if its inputs had uncommitted changes. Since images are only rebuilt when their inputs change, these may be older than the deployed commit.

- Node: `@saflib/node/git-hashes` `getGitHashes()`, `getBuildInfo()`, `listBuildInfos()`.
- Browser: `@saflib/vue` `getGitHashes()`, baked into bundles by `@saflib/vite` `makeConfig`.

`saf-git-hashes` is deprecated: it still writes the old `git-hashes.json` (read as a fallback) for products that haven't migrated.

## Migrating an existing product

Products created before `saf-docker build` keep their own copies of the dev and deploy scripts. To migrate:

1. **Dev** (`<product>/dev/package.json`): replace `saf-git-hashes && saf-docker generate && ./build-images.sh` with `saf-docker build --compose docker-compose.yaml`, delete `build-images.sh`, and point the compose `caddy` service at the dev build's derived image name (`<org>-<product>-dev:latest`).
2. **Templates**: replace hand-written upstream image names in `FROM` lines with `#{ image <package> }#`, and remove any `#{ git_hashes }#`.
3. **Deploy**: move `deploy/Dockerfile.prod` to `deploy/builds/caddy/Dockerfile.template` (with `build.json` `{ "image": "<org>-caddy" }`), using `#{ image … }#` for client stages. Better: give each static site its own build that keeps only its built output, and have the caddy build only `COPY --from` them (see home-2026's `deploy/builds/`), so changing one site doesn't rebuild the others. Stage names may not put `__` next to `-`. Then switch the deploy package to `saf-deploy` (see `@saflib/deploy-cli`), which builds and pushes exactly the images `remote-assets/docker-compose.prod.yaml` runs.
4. Check derived image names against anything that references them (compose files, remote scripts) with `saf-docker status`.
