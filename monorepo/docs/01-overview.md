# Overview

This package contains documentation and resources across the monorepo.

Includes:
- `@saflib/monorepo` - constants and type utilities
- `@saflib/monorepo/tsconfig.json` - each package should import and extend it

## Monorepo Structure

Any project which depends on `saflib` should use the following structure:

```
{repo-name}/
├── clients/
├── deploy/
├── integrations/
├── lib/
├── notes/
├── saflib/
├── services/
├── package-lock.json
└── package.json
```

