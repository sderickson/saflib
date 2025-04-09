# TypeScript Packages

This guide outlines the basic best practices for creating TypeScript packages in your monorepo.

## Package Structure

A typical TypeScript package should have the following structure:

```
package-name/
├── package.json
├── vitest.config.js # Standard test configuration
├── index.ts        # Main entry point
└── src/           # Private implementation
    └── internal/  # Internal code
```

## Package.json

A new TypeScript package should start with a minimal `package.json`:

```json
{
  "name": "@your-org/package-name",
  "description": "Brief description of the package",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {},
  "devDependencies": {
    "@saflib/vitest": "*"
  }
}
```

Key points for the initial setup:

- No `version` field needed (we're not publishing to npm).
- Use `exports` field to explicitly define the public API (typically just `index.ts`).
- `type` is `module` - we're using ESM.
- Include `@saflib/vitest` in `devDependencies` for testing configuration via the `scripts`.
- `private: true` assuming you aren't planning on publishing the package externally.
- Start with empty `dependencies` (other than `@saflib/vitest`). See below for adding further dependencies.

## TypeScript Configuration

Avoid creating one. By default, use the root `tsconfig.json`.

## Managing Dependencies

### Adding New Dependencies (Third-Party or Workspace)

1.  **Always add dependencies from the root directory** using the `--workspace` flag (or `-w` shorthand). This ensures dependencies are correctly installed in the root `node_modules`, the appropriate `package.json` is updated, and the root `package-lock.json` is updated.

    ```bash
    # Add a production dependency to a specific workspace
    npm install package-name -w @your-org/package-name

    # Add a development dependency
    npm install package-name --save-dev -w @your-org/package-name

    # Add a workspace dependency (e.g., another package in the monorepo)
    npm install @your-org/other-package -w @your-org/package-name
    # Add a workspace dependency as a dev dependency
    npm install @your-org/other-package --save-dev -w @your-org/package-name
    ```

    If you're contributing to a SAF library (when `saflib` is a git submodule):

    ```bash
    # Add dependency to a saflib package
    npm install package-name -w @saflib/package-name
    ```

2.  The dependency will be added to your package's `package.json` with the resolved version range (e.g., `^1.2.3`) or `*` for workspace dependencies.

    ```json
    {
      "dependencies": {
        "package-name": "^1.2.3",
        "@your-org/other-package": "*"
      },
      "devDependencies": {
        "dev-package-name": "^4.5.6"
      }
    }
    ```

3.  The root `package-lock.json` locks the **specific** version resolved during installation (e.g., `1.2.3` even if `^1.2.3` is in `package.json`), ensuring consistency across the monorepo. **Commit the `package-lock.json` file to your repository.**

### Workspace Dependencies Notes

- If your package depends on another package _within_ the monorepo (a workspace dependency), add it using the `npm install --workspace` command as shown above.
- Use `*` as the version specifier in your `package.json` for workspace dependencies, as managed by npm workspaces.
- If you only need the workspace dependency for testing, add it to `devDependencies`.

## Import Rules

1. Always use `.ts` extension in imports (not `.js`)
2. Use relative imports (e.g., `./file.ts`) for files within the same package
3. Use package names (e.g., `@your-org/package-name`) for imports from other packages
4. Never use relative paths with `../` to import from other packages

Example:

```typescript
// Good - importing from same package
import { Something } from "./something.ts";

// Good - importing from another package
import { OtherThing } from "@your-org/other-package"; // index.ts is implied
import { SpecificThing } from "@your-org/other-package/specific-file.ts";

// Bad - using .js extension
import { Something } from "./something.js";

// Bad - using relative path to another package
import { OtherThing } from "../../other-package/src/thing.ts";
```

## Additional Guidelines

For more specific guidance, see:

- [Database Packages](./db-packages.md) - For packages that manage data storage
- [Library Packages](./library-packages.md) - For reusable library packages

## Generated Code

If your package includes generated code (e.g., from protobuf):

1. Generate into the `dist` directory (or similar output directory).
2. Include the generated files in your package.
3. Ensure the generation script is documented and runnable (e.g., `npm run generate`).
4. Consider adding a `preinstall` or `prepare` hook in `package.json` to automate generation if necessary.

## Testing

- Each package should include a standard `vitest.config.js` at its root:

  ```js
  // package-name/vitest.config.js
  import { defaultConfig } from "@saflib/vitest/vitest.config.js";

  export default defaultConfig;
  ```

- Use `@saflib/vitest` for testing (ensured by the config above and dev dependency).
- Place tests adjacent to the code they test, using a `.test.ts` suffix (e.g., `email-client.test.ts` alongside `email-client.ts`).
