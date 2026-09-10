[**@saflib/docker**](../index.md)

---

# git-hashes

## Interfaces

| Interface                                                | Description |
| -------------------------------------------------------- | ----------- |
| [GitHashesEnvOptions](interfaces/GitHashesEnvOptions.md) | -           |

## Functions

| Function                                                    | Description                                                                                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [findProductRoot](functions/findProductRoot.md)             | Product / workspace root: nearest ancestor with `package-lock.json` (npm workspaces root). Falls back to the git root enclosing `startDir`.                 |
| [findSaflibDir](functions/findSaflibDir.md)                 | saflib root: this file lives at `saflib/docker/src/git-hashes.ts`. Prefer that over assuming `./saflib` under the git root (submodules / nested monorepos). |
| [writeGitHashesEnvFile](functions/writeGitHashesEnvFile.md) | -                                                                                                                                                           |
