# Overview

The focus of these docs are what's in `saflib`, which contains all the shared code across all SAF-based projects. It is a flat list of packages, spanning common dependencies and reusable features. It also stores all the documentation for both human and agent consumption.

[This site](https://docs.saf-demo.online/) provides a quick way to review the docs in a nice format, but you can also find these docs while you are coding with SAF by searching for their markdown files. You should include them as context in your prompts, and update them based on where the documentation falls short. See [this blog post](https://scotterickson.info/blog/2025-03-27-doc-driven-ai) for more info.

## Setup

To use these packages in a new project, you can create a project from [the official SAF template repo](https://github.com/sderickson/saf-template). You can also use the [SAF website repo](https://github.com/sderickson/saf-2025) as reference. The latter is what builds and serves this documentation using [VitePress](https://vitepress.dev/).

To use these packages in an existing project:
1. Clone [`sderickson/saflib`](https://github.com/sderickson/saflib) into your repository somewhere as a git submodule.
2. Add the directory as a workspace for your root-level `package.json`. For example if you added the submodule at the root directory, you'd add `"saflib/*"` to your [`workspaces` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#workspaces).
3. Run `npm install` or equivalent.

To use a given package, install it as a dependency in your own package, or as a dev dependency if it ends in `-dev`. The value of the dependency should be `"*"` so that it gets the workspace version. At time of writing, none of these packages are published to npm, though they certainly could be.

## Kinds of Packages

Packages tend to center around either **features** or **dependencies**. A **feature** package can be used to add a project-agnostic feature to your site (such as an auth flow or a cron service), or a set of related dependencies. In each case, they tend to require more than one package to get the job done.

For example, a full authentication feature includes the following packages:

* `auth-vue` - frontend components using Vue and related tech
* `auth-service` - the backend service with Dockerfile et al
* `auth-spec` - the specification for the API they share
* `auth-db` - the backend store which `auth-service` depends on

And a set of dependencies might be everything needed for a frontend SPA

* `vue-spa` - not just Vue, but also Vite, Tanstack Query, OpenAPI fetch, and other "runtime" dependencies
* `vue-spa-dev` - packages that go in the `devDependencies` section, such as `Vite`, `@types/*` for those above, etc.

"Dependency" packages just come in sets of two. "Feature" packages can come in a great many packages depending on how complicated it is.

If you're wondering which goes in which (why is "Vite" not a dev dependency?), the deciding factor is: does the Docker container require it?