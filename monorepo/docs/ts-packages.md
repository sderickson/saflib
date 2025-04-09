# TypeScript Packages

This guide outlines the basic best practices for creating TypeScript packages in your monorepo.

## Package Structure

A typical TypeScript package should have the following structure:

```
package-name/
├── package.json
├── index.ts        # Main entry point
└── src/           # Private implementation
    └── internal/  # Internal code
```

## Package.json

The `package.json` should be minimal and focused:

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
  "dependencies": {
    "@saflib/name-of-saf-lib": "*",
    "your-third-party-lib": "*"
  },
  "devDependencies": {
    "@saflib/vitest": "*",
    "@saflib/name-of-saf-dev-lib": "*"
  }
}
```

Key points:

- No `version` field needed (we're not publishing to npm)
- Use `exports` field to explicitly define public API (typically just `index.ts`)
- `type` is `module` - we're using ESM
- Use `@saflib/vitest` for testing configuration via the `scripts`
- `private: true` assuming you aren't planning on publishing the package externally
- Product packages will tend to depend on SAF libraries, depending on what the package does.

## TypeScript Configuration

Avoid creating one. By default, use the root `tsconfig.json`.

## Dependencies

### Adding New Dependencies

1. Always add dependencies from the root directory using the workspace flag:

```bash
# Add a dependency to a specific workspace
npm install package-name --workspace @your-org/package-name
# or use the shorthand -w flag
npm install package-name -w @your-org/package-name

# Add a dev dependency
npm install package-name --save-dev --workspace @your-org/package-name
```

Or if you're contributing to a SAF library when `saflib` is a git submodule:

```bash
npm install package-name --workspace @saflib/package-name
```

This ensures:

- Dependencies are installed in the root `node_modules`.
- The correct workspace's `package.json` is updated.
- The root `package-lock.json` is updated.
- No nested `node_modules` folders are created.

2. The dependency will typically be added to your `package.json` with `*` or the latest version range:

```json
{
  "dependencies": {
    "package-name": "^1.2.3" // Or potentially "*"
  },
  "devDependencies": {
    "dev-package-name": "^4.5.6" // Or potentially "*"
  }
}
```

3. The root `package-lock.json` will:
   - Lock the **specific** version resolved during installation (e.g., `1.2.3` even if `^1.2.3` is in `package.json`).
   - Ensure consistent versions across the entire monorepo.
   - Set up proper workspace linking.
   - **Commit the `package-lock.json` file to your repository.**

### Workspace Dependencies

If your package depends on another package in the monorepo:

1. Add it as a dependency in your `package.json`, typically using `*`:

```json
{
  "dependencies": {
    "@your-org/other-package": "*"
  }
}
```

If you depend on it only for your tests, add it to the `devDependencies` instead.

2. Run `npm install` from the root directory.

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

- Use `@saflib/vitest` for testing.
- Place tests adjacent to the code they test, using a `.test.ts` suffix (e.g., `email-client.test.ts` alongside `email-client.ts`).
