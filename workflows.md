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

## SAF: Workflow Testbed

Automated workflows are a product of SAF, and its core feature. I built SAF initially for a SaaS business, and to experiment with LLMs first-hand to form opinions. At first I tried simply writing down documents ([with the help of LLMs](https://scotterickson.info/blog/2025-03-27-doc-driven-ai)) and feeding them back to them as context for future prompts. This worked up to a point, until I found the agent would largely ignore the checklists I gave them, and wouldn't consistently follow the documentation I provided.

To solve this, I built a simple [workflow tool](https://scotterickson.info/blog/2025-05-10-workflow-first-iteration) to work with agents. It's a CLI tool which runs a state machine under the hood, and each state either

1. Prints out a prompt and exits
2. Runs a command and continues if successful, otherwise prints out an error and exits

When it exits, it saves the machine state to disk so that when it's run again, it can pick up where it left off. This way the agent can run the workflow command, get a prompt, do the work, then run the workflow command again to get the next prompt until the machine is done.

Any routine work can become a workflow with this tool, such as adding a route to a server, a page to a website, a table to a database, a deployment to a project, or a package to a monorepo. Because it's built on XState, workflows can also invoke other workflows.

Going back to SAF, I opted to compose my own framework not only because it gives me a way to discern [best practices](./best-practices.md), it also is a playground for building out these workflows and testing them out. My goal is to:

1. Write workflows for all routine work _(in progress)_
2. Set up evals for them to ensure they are reliable
3. Experiment with changing the framework to see how much best practices actually help (based on eval results)

## Exploring Workflows

You can see what workflows there are and what they look like by finding "Workflows" in the sidebar to the left. Each package in SAF which provides workflows will have one.

Here are some examples:

- [Adding a schema for an environment variable](./env/docs/workflows/add-env-var.md)

## Trying Out Workflows

Unfortunately, it's not very self-service. I still need to update [saf-template](https://github.com/sderickson/saf-template) to be able to use all modern workflows. Once that's done you'll be able to clone it and use the workflow tool with whichever coding agent (Cursor, Claude Code, Roo Code, etc.) you want.

If you're interested in collaborating on these, however, please feel free to reach out at [sderickson@gmail.com](mailto:sderickson@gmail.com)! You can also star or watch the [saflib](https://github.com/sderickson/saflib) and [saf-template](https://github.com/sderickson/saf-template) repos to keep track of developments.
