# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-11-16

### Fixed

- Add minimatch dependency.

## [0.2.0] - 2025-11-15

### Added

- `kickoff` now can take a file path to a workflow definition.
- `kickoff` has a run mode option where instead of printing prompts, it invokes an agent. Currently only "cursor" and "mock" agents are supported. Full logs of cursor CLI's output are saved to file.
- `kickoff` takes a version control option to manage version control. Currently only "git" is supported. Workflows can specify files or file globs which are expected to change.
- `kickoff` takes an option to skip checking for TODOs in update steps.
- `kickoff` and `next` commands take an optional message to prepend to the first prompt.
- Add `info` sub-command to the CLI tool, instead of overloading `kickoff` for that purpose.
- `run-scripts` command in CLI tool
- `list` command takes `all` and `details` options.
- `CwdStepMachine` for setting the current working directory.
- `pollingWaitFor` for wait for workflow machines to halt.
- `skipIf` option to `CommandStepMachine`.
- `valid` option to `CopyStepMachine`.
- `runWorkflow`, a more generic version and the replacement of `dryRunWorkflow`
- `templateFiles` values can be directories, not just files. Files within are copied recursively.
- A couple helper methods for templating: `parsePackageName`, `parsePath`, and `makeLineReplace`.
- Steps take an options object which can take `skipIf` and `validate` functions.
- Workflow steps can be other workflows, not just core steps.
- When a workflow errors, the machine state is saved to a file for debugging.
- Command step takes an "ignoreError" option.
- Add context to `npm exec saf-workflow status`.

### Fixed

- `runWorkflowCli` is async since there's async work afoot.
- CLI exiting prematurely.
- Fix `npm exec saf-workflow status`
- Checklist issue.
- Workflow tool consistently exits non-zero when there's an error.
- Logging in general.

### Changed

- Some logging.
- Some docs.
- Some "add-workflow" improvements.
- State is saved more frequently, but never when the workflow is in an error state.

### Removed

- `dryRunWorkflow` is removed. Use `runWorkflow` instead.
- Test and Doc steps. Use Command and Prompt/Update steps instead.

## [0.1.2] - 2025-09-08

### Added

- Experimental `checklistDescription` for when workflows are used in workflows.

### Changed

- Workflow output is now a single ChecklistItem, not a array of them. The change is internal; does not break backwards compatibility.

### Fixed

- Prompts are no longer printed when checklists are printed.
- Using workflows in workflows should work, but it's not fully stable yet.
- Tweak what's printed when the workflow is completed.

## [0.1.1] - 2025-09-06

### Added

- Core workflow functionality
- Workflow CLI tool
- `workflows/add-workflow` workflow
- Dependency: commander@^14.0.0
- Dependency: xstate@^5.19.3
