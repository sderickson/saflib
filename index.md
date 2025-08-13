# Overview

SAF is Scott's Application Framework - I built it for me, but also I'm making this repo public for people to use and play around with. SAF is a full-featured web application framework using my preferred libraries and services.

Guiding principles:

- **Self-Contained**. The app should run with little setup or dependencies on outside services except for things that are really essential, such as dependable, trusted email services.
- **Feature Complete**. Provide the sorts of features you'd expect as an application developer or engineering manager to have on hand such as CI/CD pipeline, common backend services like background tasks or message queues, and code health reports. It should feel mature and modern.
- **Batteries Included**. Provides common features, services, and utilities. These might be simple libraries like common Express middleware configuration, or entire E2E services like sign-up/sign-in flows and an identity service.
- **Easy to Update**. I want to be able to pretty quickly build a new common tool in this repo and then share it with all the applications that use this framework. Or update things to the latest libraries. That's partly on the application, though, to have thorough and well-balanced testing.
- **Built for AI**. This is sort of my playground to experiment with and share methodologies and tools. Technical decisions and workflows are being made for AI coding agents to do work conistently and cheaply.

## Documentation

The focus of the docs on this site are what's in `saflib`, which contains all the shared code across all SAF-based projects. It is a (mostly) flat list of packages, spanning common dependencies and reusable features. It also stores all the documentation for both human and agent consumption.

[This site](https://docs.saf-demo.online/) provides a quick way to review the docs in a nice format, but you can also find these docs while you are coding with SAF by searching for their markdown files. Include them as context in your prompts, and update them based on where the documentation falls short.

## Setup

To use these packages in a new project, you can create a project from [the official SAF template repo](https://github.com/sderickson/saf-template). You can also use the [SAF website repo](https://github.com/sderickson/saf-2025) as reference. The latter is what builds and serves this documentation using [VitePress](https://vitepress.dev/).

To use these packages in an existing project:

1. Clone [`sderickson/saflib`](https://github.com/sderickson/saflib) into your repository somewhere as a git submodule.
2. Add the directory as a workspace for your root-level `package.json`. For example if you added the submodule at the root directory, you'd add `"saflib/**"` to your [`workspaces` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#workspaces).
3. Run `npm install` or equivalent.

To use a given package, install it as a dependency in your own package. The value of the dependency should be `"*"` so that it gets the workspace version. At time of writing, none of these packages are published to npm, though they could be.
