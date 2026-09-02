# Overview

`@saflib/dev-tools` is a utility package, providing mainly a central list of bin commands for working across a SAF project. Code within this package should be small; if a command grows large then it should be split out into a separate package and called from here.

## Code

Provides utilities for getting information about the NPM workspace. The CLI tools this package provides are some of the main consumers of these utilities.

See [Code Reference](./ref/index.md) for more info.

## Package issues

When clearing `saf-dev-site issues` / `analyze-package` findings (dead code, layout, oversized files), follow [Package issues triage](./package-issues.md).

## CLI

These are fairly disparate tools, their only theme being they apply to all sorts of packages. These tools may be split out into separate packages later.

See [CLI Reference](./cli/index.md) for more info.
