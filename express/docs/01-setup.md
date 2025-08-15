# Overview

This library provides a set of shared logic, documentation, libraries, and workflows for using [Express](https://expressjs.com/en/5x/api.html) in an app. This has mainly been developed on [Node](https://nodejs.org/en), but it's not explicitly dependent on that runtime.

## Package Structure

Each package which depends on `@saflib/express` should have the following structure:

```
{service-name}-http/
├── http.ts
├── middleware.ts
├── routes/
│   └── {feature-1}/
│   │   ├── index.ts
│   │   ├── get-all.test.ts
│   │   ├── get-all.ts
│   │   ├── get-by-id.test.ts
│   │   ├── get-by-id.ts
│   │   └── ...
│   ├── {feature-2}/
│   └── ...
├── package.json
```

## Files and Directories Explained

### `https.ts`

This exports either an express app, an express router, or both.

If it's a router, it should only include middleware that's specific to that router's logic, which is everything returned by `createPreMiddleware`.

### `routes/`

The
