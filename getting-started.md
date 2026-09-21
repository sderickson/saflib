# Getting Started

## Starting a New SAF Project

### Initialize the Repo

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

The [saf-create.sh](https://github.com/sderickson/saflib/blob/main/product/create/saf-create.sh) script adds [`saflib`](https://github.com/sderickson/saflib) as a submodule, creates the root workspace `package.json`, and runs the fully-automated (no agent required) [`product/init`](./product/docs/workflows/init.md) workflow.

### Test for Issues

Do the following both to make sure everything works as expected, and to get a sense of what SAF and the base SAF product can do.

1. Run `npm run typecheck`. Run it a second time and it should go much faster.
2. Run `npm run test` (unit tests).
3. Go to the `<project-name>/dev` directory and run `npm run dev`. Once Docker finishes building the containers are running, you should be able to access the app at [http://docker.localhost/](http://docker.localhost/) and explore the app.
4. With `dev` running, open the dev site at [http://localhost:3099](http://localhost:3099) and try looking at the current checkout (history won't be very interesting, and build is not built yet).
5. Go to `deploy/` and run `npm run build && npm run prod-local`. This is a production build of the app run locally. The main difference is you're serving static assets vite built rather than running the vite dev server.
6. With `prod-local` running, run `npm run test:e2e` from `<project-name>/clients/admin` and `<project-name>/security`. These should pass.

### Run Individual Workflows

One of the core features of SAF is a tightly integrated workflow tool. Most additions to products (SPA pages, database tables, integrations, etc.) should be done via workflows to get the best results in speed, efficiency, and quality.

Try adding something new with a workflow, such as `vue/add-view` from one of the SPA packages (e.g. `<project-name>/clients/app`) or `drizzle/update-schema` from the `<project-name>/service/db` package. See in particular the [Running Workflows](https://workflows.saf-demo.online/manual-testing.html) section of the workflows documentation. If you want to build up from manual to automated, do things in this order:

1. [**Manual testing**](https://workflows.saf-demo.online/manual-testing.html): You are the agent! The tool prompts _you_ to make the changes that otherwise your agent would make.
2. [**With an Agent** (agent driven)](https://workflows.saf-demo.online/with-an-agent.html#the-agent-invokes-the-workflow-tool): Works with any agent you use. Prompt the agent to use the workflow and follow its instructions. This is not the intended way to use this tool, but it _is_ flexible.
3. [**With an Agent** (tool driven)](https://workflows.saf-demo.online/with-an-agent.html#the-workflow-tool-invokes-the-agent): The intended way to use this tool via CLI. Requires an integration with your agent of choice, and currently only supports Cursor's CLI agent.

More agent support and a UI interface are coming soon.

### Run a Series of Workflows

If you want to add a larger feature, you can create a [complex workflow](https://workflows.saf-demo.online/complex-workflows.html) which is simply a series of the individual workflows that come with SAF. To streamline this, prompt your agent to run the [processes/spec-project](./processes/docs/workflows/spec-project.md) workflow. Tell it what you want to build and it will write a spec, a plan, and finally a series of workflows you can run, providing the path to the workflow rather than an id.

### Deploy your Product

If you want to deploy:

1. Set up a domain name and point it to a host you have SSH access to.
2. Make sure `deploy/env.remote` is configured appropriately.
3. Run `npm run remote-setup` from `deploy/`. This will set up the necessary dependencies on the remote host.
4. Log into the remote host and make sure it has read access to your container registry.
5. Run `npm run full-deploy` from `deploy/`. This builds the app, pushes it to the configured container registry, syncs some necessary remote assets, then spins up the docker containers pulling the images you built from the registry.

If you navigate to the domain name you set up, you should see the app running.
