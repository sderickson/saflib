# saf-tests

```
Usage: saf-tests [options] [command]

Manages test assets from e2e and unit tests.

Options:
  -h, --help                  display help for command

Commands:
  generate-coverage           Generate unit test coverage, running `vitest run
                              --coverage` in each package with tests.
  gather-assets <target-dir>  Gathers coverage and screenshot assets from unit
                              and e2e tests respectively, creating a manifest
                              file and depositing everything in the target dir.
  help [command]              display help for command

```
