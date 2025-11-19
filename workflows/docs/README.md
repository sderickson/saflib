`saflib-workflows` is two things:

1. An npm package for doing routine coding work with LLMs reliably.
2. An experiment in automating routine work with LLMs generally.

This library came about while exploring using LLMs in web development. It is a simple, portable way to get coding agents to follow a plan reliably with automated supervision. It uses developer-provided code templates, prompts, and validation checks to guide and contain the agent. These workflows are specific and tailored to your project, preferences, and stack.

The library provides:

- A way to define routine software development tasks in TypeScript.
- Tools to test and run these workflows, including a CLI and functions.
- Dedicated integrations with headless CLI agents (as of writing, only [Cursor CLI](https://cursor.com/cli)).

This library is written in conjunction with [my web framework](https://docs.saf-demo.online/), which has many workflow examples.

----

See the [dedicated docs](https://workflows.saf-demo.online/) for more information.

Quick links:

* [Introduction](https://workflows.saf-demo.online/)
* [Quick Start](https://workflows.saf-demo.online/quick-start.html)
* [Code Reference](https://docs.saf-demo.online/workflows/docs/ref/)
* [GitHub Project](https://github.com/users/sderickson/projects/2/views/4)
* [Source](https://github.com/sderickson/saflib/tree/main/workflows)
* [NPM Package](https://www.npmjs.com/package/saflib-workflows)