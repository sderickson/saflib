# Creating TypeScript Packages

This guide outlines the best practices for creating TypeScript packages in your monorepo.

## Package Structure

A typical TypeScript package should have the following structure:

```
package-name/
├── package.json
└── src/           # Source files
    └── index.ts   # Main entry point
```

## Package.json

The `package.json` should be minimal and focused:

```json
{
  "name": "@your-org/package-name",
  "description": "Brief description of the package",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
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
- `main` points to the TypeScript file (we strip types at runtime)
- `type` is `module` - we're using ESM
- No separate types field needed
- Use vitest for testing
- `private` assuming you aren't planning on publishing the package
- Product packages will tend to depend on SAF libraries, depending on what the package does.

## TypeScript Configuration

Avoid creating one. By default, use the root tsconfig.

## Dependencies

### Adding New Dependencies

1. Add the package to your package.json without versions:

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

2. Run `npm install` from the root directory to:
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
import { OtherThing } from "@your-org/other-package/src/thing.ts";

// Bad - using .js extension
import { Something } from "./something.js";

// Bad - using relative path to another package
import { OtherThing } from "../../other-package/src/thing.ts";
```

## Generated Code

If your package includes generated code (e.g., from protobuf):

1. Generate into the `dist` directory
2. Include the generated files in your package
3. Make sure the generation script is documented, and runs as `npm run generate`
4. Consider adding a preinstall hook to ensure generation happens

## Testing

- Use vitest for testing
- Place tests adjacent to what they test, with `.test.ts` suffix
