# Overview

Shared Express.js commands and middleware for SAF services. This library provides common functionality used across SAF Express.js applications, helping maintain consistency and reducing code duplication.

## Installation

This package is part of the SAF monorepo and is installed automatically through npm workspaces.

## Structure

```
{service-name}-http/
├── routes/
│   ├── index.ts
│   └── [feature]/    # Directory for a specific feature's routes
│       ├── index.ts
│       ├── get-all.ts
│       ├── get-all.test.ts
│       ├── get-by-id.ts
│       ├── get-by-id.test.ts
│       └── ...           # Other handlers and their tests
├── http.ts
├── middleware.ts
├── package.json
└── vitest.config.mts
```
