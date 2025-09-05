# Automated Workflows

Workflows are _the_ core feature of my web application framework, SAF. This page explains what they are and the problem they solve.

**_If you're frustrated by how much time you spend quality-controlling LLMs as you code, read on._**

## The Problem: Lack of LLM Accountability

_Note: I understand an LLM or agent wrapper around it is **not** an intelligent being and cannot be "held accountable" like a person, but for the sake of brevity, that's how I'll put it._

The largest gap I see in current LLM-powered coding tools is a lack of [accountability](https://scotterickson.info/blog/2025-05-24-Accountability-and-Gaslighting) for the agents that produce code. A great deal of time spent managing agents is simply reviewing the work they do and that they follow instructions, conventions, and rules.

To solve this, much of the industry's focus (in 2025) seems to be banking on either

1. Better prompting
2. Better tasking
3. Better LLMs

Better prompting can only get you so far. Even if you prompt the agent to run tests, they may not do them. The output of the LLM needs to be _independently_ verified that it actually did what it was prompted to do, and that it did so correctly (by whatever definition of "correct" you have, see [governing](https://scotterickson.info/blog/2025-06-14-governing-products)).

Creating, generating, and working through tasks is great, but I believe that's putting the cart before the horse. First, agents need to be able to consistently and reliably run simple tasks before they can be orchestrated at a higher level.

In terms of improving LLMs, it's unclear how much better they'll get as a technology in the near term. I'm willing to bet, though, that regardless of how good they get in the next decade or so, they still need to be held accountable.

## The Solution: a CLI Tool for Workflows

Automated workflows are a product of SAF, and its core feature. I built SAF initially for a SaaS business, and to experiment with LLMs first-hand to form opinions. At first I tried simply writing down documents ([with the help of LLMs](https://scotterickson.info/blog/2025-03-27-doc-driven-ai)) and feeding them back to them as context for future prompts. This worked up to a point, until I found the agent would largely ignore the checklists I gave them, and wouldn't consistently follow the documentation I provided.

To solve this, I built a simple [workflow tool](https://scotterickson.info/blog/2025-05-10-workflow-first-iteration) to work with agents. It's a CLI tool which runs a state machine under the hood, and each state either

1. Prints out a prompt and exits
2. Runs a script (such as copying over template files) and continues
3. Does a check (such as running a regex on a file or running a unit test) and continues if successful, otherwise prints out an error and exits

When it exits, it saves the machine state to disk so that when it's run again, it can pick up where it left off. This way the agent can run the workflow command, get a prompt, do the work, then run the workflow command again to get the next prompt until the machine is done. See [this blog post](https://scotterickson.info/blog/2025-05-10-workflow-first-iteration) for more details.

Any routine work can become a workflow with this tool, such as [adding a route to a spec](./openapi/docs/workflows/update-spec.md), a [server handler for the route](./express/docs/workflows/add-handler.md), a [page to a website](./vue/docs/workflows/add-spa-page.md), a [table to a database](./drizzle/docs/workflows/update-schema.md), a deployment to a project (TODO!), or a [package to a monorepo](./monorepo/docs/workflows/add-ts-package.md). Because it's built on [XState](https://stately.ai/docs), workflows can also invoke other workflows.

Going back to SAF, I opted to compose my own framework not only because it gives me a way to discern [best practices](./best-practices.md), it also is a playground for building out these workflows and testing them out and optimizing the stack _for_ the workflows. My goal is to:

1. Write workflows for all routine work _(in progress)_
2. Set up evals for them to ensure they are reliable
3. Experiment with changing the framework to see how much best practices actually help (based on eval results)

## Demo

This is a demo of the workflow tool in action, using [`@saflib/drizzle`](./drizzle/docs/workflows/index.md) workflows to create a database schema and five queries in 13 minutes.

<iframe width="100%" height="400" src="https://www.youtube.com/embed/p6jfG5JH7_8?si=Avxv1kGjHLmXW4nP" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Here are the exact prompts I used in the demo.

**Prompt 1**

> Hey, I’d like to add a simple TODO app as a demonstration. To start, I’d like you to update the database schema to add a new table for TODOs. Can you go to /services/caller/caller-db and run `npm exec saf-workflow kickoff update-schema` and follow the prompts to add a new table with a very straightforward todo schema?

**Prompt 2**

> Looks good! Now I’d like to add queries for it. Please within this same directory run `npm exec saf-workflow kickoff add-queries ./queries/todos/create.ts` and set that up to create a todo?

**Prompt 3**

> Looks good! Let’s add more database queries. Let's start with `get-all.ts`, then `get-by-id.ts`, `update.ts`, and `remove.ts`.

## Exploring Workflows

You can see what workflows there are and what they look like by finding "Workflows" in the sidebar to the left. Each package in SAF which provides workflows will have one.

The documentation for each workflow is generated. In the docs for any given workflow, there's a "Checklist" section which is just what you get when you run the [workflow tool](./workflows-cli/docs/cli/saf-workflow.md) `checklist` command for that workflow.

## Trying Out Workflows

The `@saflib/workflows` package [documentation](./workflows/docs/README.md) explains how to install and use workflows in your own project. The only workflow that comes with that is one for adding workflows; you'll need to create your own otherwise since workflows are specific to your stack.

If you'd like to try the workflows I use with my stack, clone and/or fork the [saf-template](https://github.com/sderickson/saf-template) repo. That repo has instructions on how to set it up. These SAF workflows are still experimental so your mileage may vary.

If you're interested in collaborating on workflows, please feel free to reach out at [sderickson@gmail.com](mailto:sderickson@gmail.com) or create issues in [saflib](https://github.com/sderickson/saflib) You can also star or watch any of the following:

- [saflib repo](https://github.com/sderickson/saflib) repo
- [SAF Project Board](https://github.com/users/sderickson/projects/2/views/3)
