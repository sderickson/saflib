# Overview

SAF projects are set up to make the most of coding agents, and to share logic between projects. This "package" simply houses documents and templates for the agent to use in planning and execution, and so one agent instance to the next can continue.

## Folder Structure

The recommended structure is to have a `notes/` folder at the root of the repository, and one folder in there for each project, with the date of the project prefixing. Each project has at least a `spec.md` and a `checklist.md` file in it, but also any other files which are helpful such as images or HTML snippets to guide the developer and agent.

The process for a single project is:

1. Create branches from `main` for both your project and `saflib`.
2. Agent creates a folder and a spec using the template, human reviews and updates.
3. Agent creates a checklist, human reviews and updates.
4. Human and agent do a few checkmarks at a time, updating checklist, spec, and documentation as necessary.
5. Once the checklist is finished, create one PR for both repositories with all the changes
6. Review, then squash and merge them into `main`.

So the output of a single feature ideally includes both the feature itself, and improvements to shared code/documentation.

## Prompting

When starting a project, include:
* A few sentences describing the feature.
* Which packages you expect to be changed or created.
* Where you want the project folder to be and what it'll be named.
* Instructions to create a `spec.md` file there based on [this template](../feature-spec-template.md).

Review and update the spec; you'll be giving it to each agent that works on the feature so it's worth it to make sure it's accurate.

Once the spec is in good shape, prompt the same agent to create a `checklist.md` file based on [this template](../feature-checklist-template.md).

At this point execution is a loop, one agent for each loop:
1. Begin a new chat, including a link to the spec, the checklist, a relevant doc or two, and for good measure, the exact lines you want the agent to do during that chat.
2. Work with the agent to get the job done. If the agent doesn't do it correctly at first, try to guide them to fix what they've done. If you fix it yourself, tell the agent what you did and why.
3. Once the given task is done, instruct the agent to update or add documentation based on the guidance you provided.
4. Now would be a good time to do any refactoring as well.

In terms of how much you do in one "loop", a good rule of thumb is:
1. Changes scoped to a single package
2. Related unit tests, also in that package