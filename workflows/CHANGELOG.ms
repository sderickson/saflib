# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `kickoff-unlisted` command for running workflows from a file path.
- `CwdStepMachine` for setting the current working directory.
- `pollingWaitFor` for wait for workflow machines to halt.

### Fixed

- Made `runWorkflowCli` async since there's async work afoot.
- Fix the CLI exiting prematurely.

### Changed

- Some logging improvements.

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
