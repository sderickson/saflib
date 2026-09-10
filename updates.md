# SAF Versioning

Updates are somewhat loose, since the framework is still undergoing rapid development, but here's some rough guidance:

## Major Versions

Major versions will have their own dedicated branch, and the most recent, stable version will be referenced in [./index.md](./index.md). If bugs are found and fixed, they will be applied to that branch.

## Creating a new major version

1. Run through the instructions in [./index.md](./index.md) to create a new version and make sure everything works.
2. Update the version in [./index.md](./index.md) to the new version, using the intended branch name.
3. Merge changes into main, then create the new branch off that commit in main.
4. Update the website to reference the new version.