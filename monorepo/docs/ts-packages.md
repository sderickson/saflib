# TypeScript Packages

This guide outlines the basic best practices for creating TypeScript packages in your monorepo.

## Package Structure

A typical TypeScript package should have the following structure:

```
package-name/
├── package.json
├── index.ts        # Main entry point
├── types.ts        # Public types
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
    ".": "./index.ts",
    "./types": "./types.ts"
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
    "@saflib/name-of-saf-dev-lib": "*"
  }
}
```

Key points:

- No version field needed (we're not publishing)
- Use `exports` field to explicitly define public API
- `type` is `module` - we're using ESM
- No separate types field needed
- Use vitest for testing
- `private` assuming you aren't planning on publishing the package
- Product packages will tend to depend on SAF libraries, depending on what the package does.

## TypeScript Configuration

Avoid creating one. By default, use the root tsconfig.

## Dependencies

### Adding New Dependencies

1. Always add dependencies from the root directory using the workspace flag:

```bash
# Add a dependency to a specific workspace
npm install package-name --workspace @your-org/package-name
# or use the shorthand -w flag
npm install package-name -w @your-org/package-name

```

Or if you're contributing to a SAF library when saflib is a git submodule

```bash
npm install package-name --workspace @saflib/package-name
```

This ensures:

- Dependencies are installed in the root `node_modules`
- The correct workspace's package.json is updated
- The root package-lock.json is updated
- No nested node_modules folders are created

2. The dependency will be added to your package.json without versions:

```json
{
  "dependencies": {
    "package-name": "*"
  },
  "devDependencies": {
    "dev-package-name": "*"
  }
}
```

3. The root package-lock.json will:
   - Install the latest versions and lock the versions
   - Ensure consistent versions across the monorepo
   - Set up proper workspace linking

### Workspace Dependencies

If your package depends on another package in the monorepo:

1. Add it as a dependency in your package.json:

```json
{
  "dependencies": {
    "@your-org/other-package": "*"
  }
}
```

If you depend on it for your tests, add it to the devDependencies instead.

2. Run `npm install` from the root directory

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
import { OtherThing } from "@your-org/other-package/thing.ts";

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

1. Generate into the `dist` directory
2. Include the generated files in your package
3. Make sure the generation script is documented, and runs as `npm run generate`
4. Consider adding a preinstall hook to ensure generation happens

## Testing

- Use vitest for testing
- Place tests adjacent to what they test, with `.test.ts` suffix
