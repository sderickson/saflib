# Overview

SAF stands for Scott's Application Framework. I've built it to:

1. Build my own production-ready web apps
2. Experiment with LLM-assisted development
3. Share and collaborate on what I learn

Guiding principles:

- **Self-Contained**. A new app should run with little setup or dependencies on outside services.
- **Feature Complete**. Includes expected modern web app features such as CI/CD, background jobs, and i18n.
- **Batteries Included**. Optional but common features and services are included, such as secret and blob storage.
- **Easy to Update**. When the framework introduces breaking changes, updates can happen mostly automatically.
- **Built for AI**. Technical feature development decisions are always made with AI coding agents in mind.

## Adoption Concerns

This framework's quality bar meets and exceeds the needs for production-grade apps generally. That being said, if anyone adopts this they should assess the framework themselves and either fork it and make desired adustments and ideally submit PRs for them.

The framework is also fairly flexible and the concepts portable to your needs and preferences. If out of the box you'd rather use PostgreSQL instead of SQLite, Drizzle supports both and more. If you'd rather use React instead of Vue, the frontend organizational structure can mostly be kept. Also, common services such as for observability accept adapters for whichever in-house or third-party services you prefer.

## Documentation

The focus of the docs on [this site](https://docs.saf-demo.online/) are what's in [`saflib`](https://github.com/sderickson/saflib), which contains all the shared code across all SAF-based projects. It is a broad collection of packages, spanning common dependencies and reusable features.

These docs are also accessible when coding with SAF by searching for their markdown files. Include them as context in prompts, and update them as part of normal work.

## Setup

### New project

To create a new SAF project:

1. Choose a project name and domain name (domain name can be easily changed later, product name less so).
2. Make sure you have **Node.js 26+** installed and **Docker** running.
3. Create a new git repository and initialize it with `git init`.
4. From inside the empty repo, run the following commands, inserting your project name and domain name:

```bash
curl -fsSL https://raw.githubusercontent.com/sderickson/saflib/v0.4/product/create/saf-create.sh -o saf-create.sh
chmod +x saf-create.sh
./saf-create.sh <product-name> <domain-name> --saflib-ref v0.4
rm saf-create.sh
```

This adds [`saflib`](https://github.com/sderickson/saflib) as a submodule, creates the root workspace `package.json`, and runs [`product/init`](./product/docs/workflows/init.md).

To make sure everything works:

1. Run `npm run typecheck`. Run it a second time and it should go much faster.
2. Run `npm run test` (unit tests).
3. Go to the `<project-name>/dev` directory and run `npm run dev`. Once Docker finishes building the containers are running, you should be able to access the app at [http://docker.localhost/](http://docker.localhost/) and explore the app.
4. With `dev` running, open the dev site at [http://localhost:3099](http://localhost:3099) and try looking at the current checkout (history won't be very interesting, and build is not built yet).
5. Go to `deploy/` and run `npm run build && npm run prod-local`. This is a production build of the app run locally. The main difference is you're serving static assets vite built rather than running the vite dev server.
6. With `prod-local` running, run `npm run test:e2e` from `<project-name>/clients/admin` and `<project-name>/security`. These should pass.
7. Try adding something new with a workflow, such as `vue/add-view` from one of the SPA packages (e.g. `<project-name>/clients/app`) or `drizzle/update-schema` from the `<project-name>/service/db` package. See the [workflows documentation](https://workflows.saf-demo.online/) for more information.

If you want to deploy:

1. Set up a domain name and point it to a host you have SSH access to.
2. Make sure `deploy/env.remote` is configured appropriately.
3. Run `npm run remote-setup` from `deploy/`. This will set up the necessary dependencies on the remote host.
4. Log into the remote host and make sure it has read access to your container registry.
5. Run `npm run full-deploy` from `deploy/`. This builds the app, pushes it to the configured container registry, syncs some necessary remote assets, then spins up the docker containers pulling the images you built from the registry.

If you navigate to the domain name you set up, you should see the app running.

### Existing project

To add SAF to a repository that does not use `saf-create`:

1. Clone [`sderickson/saflib`](https://github.com/sderickson/saflib) into your repository somewhere as a git submodule.
2. Add the directory and its subdirectories as a workspace for your root-level `package.json`. For example if you added the submodule at the root directory, you'd add `"saflib/**"` to your [`workspaces` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#workspaces).
3. Run `npm install` or equivalent.
4. Run `npm exec saf-workflow kickoff product/init <name> <domain>` from the monorepo root.

To use a given package, install it as a dependency in your own package. The value of the dependency should be `"*"` so that it gets the workspace version.
