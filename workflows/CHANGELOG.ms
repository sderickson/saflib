# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
