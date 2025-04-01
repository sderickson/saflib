# Overview

This package contains cross-cutting documentation and resources. Most other packages have a specific scope, but this one captures everything those do not.

Includes:

- `eslint.config.js` - your own should import and extend this one.
- `tsconfig.json` - ditto

As a rule of thumb, files which live at the root of your project should live here.

Documentation which lives here tend to be "meta" commentary, which apply to various packages. For example, the "Database Packages" documentation would apply to packages which provide interfaces for SQLite, MongoDB, Redis, or anything else like those. Documentation specific to any of those technologies live in their own respective SAF packages.
