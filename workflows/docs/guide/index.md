# Introduction

## What is `saflib-workflows`?

It is two things:

1. An npm package for doing routine coding work with LLMs reliably.
2. An experiment in automating routine work with LLMs generally.

This library came about while exploring working with LLMs in web development. It is a simple, portable way to get coding agents to follow a plan reliably with automated supervision. It uses developer-provided code templates, prompts, and validation checks to guide and contain the agent. These workflows are specific and tailored to your project, preferences, and stack.

The library provides:

- A way to define routine software development tasks in TypeScript.
- Tools to test and run these workflows, including a CLI and functions.
- Dedicated integrations with headless CLI agents (as of writing, only [Cursor CLI](https://cursor.com/cli)).

This library is written in conjunction with [my web framework](https://docs.saf-demo.online/), which has many workflow examples.

## Building Up Complexity

To generate large amounts of code reliably, it's important to start small and build up from there. There are three levels of complexity:

1. Individual workflow steps
2. Routine workflows, which are a series of steps
3. Complex workflows, where one or more steps are other workflows

### Workflow Steps

A workflow is most of all a series of steps; a checklist or [how-to guide](https://diataxis.fr/how-to-guides/) to be followed.

The steps which this library comes with are:

1. **Copy** file(s) from template
2. **Update** copied file(s)
3. **Prompt** the agent
4. **Command** (shell commands)
5. **CD** (Change Directory)

Copy and update work together, and are often the first steps of any workflow. Files with the basic structure of the thing will be copied from a template, then the agent is prompted to update one or more of them with the implementation. Giving an agent a scaffold to build from greatly reduces variability and improves reliability, and sets the whole effort on the right foot.

Prompts are arbitrary commands to the agent. These are often used for integration work, such as exporting the thing that was just implemented from the package.

Commands do double duty: they can be used to run scripts such as generating code from schemas, and they can run tests to make sure the agent has done the thing correctly. These are a great way to finish a workflow, to make sure the agent has actually built everything "to code".

CD steps are mainly used in monolithic repos, and in complex workflows, where the context of one step is different than another. Think changing to the client directory after having worked in the server directory.

### Routine workflows

The most basic workflow is for some routine task. For a web stack, routine (or simple) workflows might be:

- Add a query to the database
- Add a route to the http server
- Add a page to the web site


::: info
Most workflows I've written add some new unit, but that's mainly because what I've been using workflows for is building new products. There could also be workflows for removing or changing things, though this is an area I haven't explored as much since I haven't needed them yet.
:::

Routine workflows benefit from regular investment. If they produce something suboptimal, the fix is often editing the workflow. Combine or rearrange prompts, change file templates, things like that. Code reviews don't result in feedback to an LLM which will be quickly lost, intermittently applied, or subsumed into a proprietary memory bank, but instead go into the workflow in your codebase that future agents will go through.

### Complex workflows

Larger changes to the codebase are made with workflows by combining them. Once routine workflows are reliable and effective, then to write a new feature, you write (or generate) a one-time workflow which is a series of other workflows, and execute that.

Complex workflows can also themselves take inputs to do a process many times, such as a migration. In which case you have one "entire migration" workflow as a series of another "single migration" workflow, which itself calls various routine workflows.

## Execution modes

There are various ways to execute a workflow which this tool supports.

### Agent-driven

This is the original execution mode: the user instructs the agent to run the CLI. The agent then runs that command, the CLI prints a prompt, the agent does the thing it is told (hopefully) and then calls the workflow tool for the next prompt (hopefully). The agent repeats this until the workflow is finally done (hopefully).

The trade-off is that while this mode works with any IDE or CLI coding agent tool, you're reliant on the agent being reliable, which it isn't. The workflow tool was written in large part because agents don't reliably follow instructions! While agent-driven execution can be used to run workflows, they still require supervision to keep the agent on track and verify it followed through.

Running the workflow by calling the CLI for prompts is also a way to manually test your workflow: instead of telling an agent to call the workflow tool you can just call it and follow the steps to check the experience, or to learn the process yourself.

### CLI-driven

Workflows yield more reliable results when the CLI invokes the agent. This way you know that if the workflow tool completes successfully, the workflow has definitely been completed and all the checks have passed.

The downside is the workflow tool needs to have an integration written with whatever agentic tool is doing the work. But it's worth it to not have to continuously supervise and nudge the agent.

### Debugging

The tool provides a couple other ways to run workflows without an agent:

1. Dry
2. Script

In a dry run, no commands are run, no files are copied, and no agents are prompted. It's a way to exercise everything that's "safe" in a workflow.

In script mode, files are copied and scripts are run, but no agents are prompted. This is effectively an integration test where everything but the actions of the agent are tested. This is useful to make sure that, before having an agent do a workflow, you check that the fully-automatic work in a workflow... works.

## Versus Other Agentic Workflows

This library exists because the kinds of workflow tools available in 2025 are costly in reliability, time, and risk, which limit or negate much of their potential value. Approaches fall into three groups:

1. Vibe coding
2. LLM micro-management
3. Black-box services

### Vibe coding

It is pretty amazing what people can build now without any coding knowledge, or without having to apply that knowledge. There is no doubt that, out of the box, LLMs give people greater capabilities to build software.

However, at least the way agents behave now, building with this method quickly hits a wall. Agents write inconsistent and tightly coupled modules, with overly complicated functions and components, leading to a codebase that is brittle and cumbersome much sooner than a classically and professionally built stack does. The high of vibe coding and rapid development is followed by the hangover of massive, compounding tech debt.

LLMs are still a new technology, and their capabilities will continue to improve. However, this library is built on the assumption that the fundamental characteristics of LLMs will not change substantially, and so workflows will be a valuable way to get the most out of coding tools for the foreseeable future.

### Micro-managing

A very different tack is to use LLMs heavily but with manual supervision. Code that is generated is reviewed, edited, trimmed, and fixed, either through more prompting or directly by the developer. This takes much more time-per-line than vibe coding, but it protects against cancerous code growths.

This approach can run the gamut from checking every line to being tactical about what generated code gets thorough review. You can spend more time reviewing code for platforms, interfaces, and risky areas, and give the rest a passing glance. A balanced approach between these two extremes leads to the best productivity gains overall, and when doing non-routine changes or figuring out what the routine should be this is the best way to go. Once you have identified a routine and decided how it should be, that's when to introduce a workflow.

### Black box service

The most ambitious attempt to change the nature of software development are products and services that eschew code as the source of truth at all; instead product specs and issue trackers are the "source". Documentation is written and updated and code is generated from that corpus, like some sort of higher-order compiler. These are the most extreme; there are of course services which help you start the product with a description and some iteration, then allow you to "eject" the code that's built which can be expanded upon normally.

It may be that one or more of these services can produce great things, but finding out directly is risky and time-consuming. One could evaluate their potential by building many products with many of them and see how far you can get. But this is costly and if it turns out they don't work, you often can't determine why since the mechanisms and strategies are proprietary and hidden.

In an indirect way, this library is an attempt to see how viable these approaches can be. By building an open-source framework for generating routine code reliably, we can get a better sense of how high this house of cards really can go.
