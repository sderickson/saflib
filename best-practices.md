# Best Practices

The following are rules I recommend for _any_ software stack so that both human and AI agents work quickly and effectively. I use my work on SAF to identify, develop, and demonstrate these rules. This is a living document, and will continue to evolve as I learn more.

## Embrace Type Safety at Every Layer

Many of the following rules depend on the stack having a type system. Unless _every_ interface in the stack can by typed, development will be fundamentally hampered, as static analysis provides an immediate and reliable feedback loop which is critical for rapid and reliable development.

**Example applications:**

- [`@saflib/drizzle`](./drizzle/docs/01-overview.md) relies heavily on Drizzle's [Type API](https://orm.drizzle.team/docs/goodies#type-api)
- [`@saflib/express`](./express/docs/03-routes.md#typing-the-interface) and [`@saflib/sdk`](./sdk/docs/02-requests.md#creating-a-typed-client) provide documentation and utilities to enforce types generated with [`@saflib/openapi`](./openapi/docs/cli/saf-specs.md)
- [`@saflib/vue`](./vue/docs/03-i18n.md) flips how vue-i18n typically works, so that translated strings become typechecked
- [`@saflib/playwright`](./playwright/docs/overview.md#string-locators) provides a custom locator that takes typed objects provided by frontend packages, to ensure tests and the components they test render and check for the same strings
- [`@saflib/env`](./env/docs/overview.md) allows typing and validating environment variables

## Return Errors

Some languages (such as Go) expect errors to be returned by functions. Others (such as Java) let you specify what they throw. Many do neither; lacking a way to specify what kinds of exceptions they emit one way or another.

For those in the last camp, instead of `throw`ing or `raise`ing exceptions or errors, adopt a common interface which returns either an error **or** a result (never both, never neither). With TypeScript for example, an operation which may fail in normal operations should result in something like this:

```typescript
const { result, error } = await unsafeOperation();
if (error) {
  switch (true) {
    case error instanceof ErrorClass:
      return res.status(errorCode);
    default:
      throw error satisfies never;
    }
  }
}

// At this point, TypeScript knows that result is defined.
use(result.someValue);
```

Note that logic may still `throw` exceptions, but this should be truly exceptional. Exceptions should only be thrown in cases where, if it _actually_ happens in a test or in production, it will be considered an issue to be fixed.

Packages should only return instances of Errors they define. Propagating downstream errors (such as from a dependency like a database error) upstream is a form of tight coupling. Even unhandled errors should be caught at the package or service boundary and obfuscated (such as a generic "UnhandledError") to ensure consumers _cannot_ tie themselves to deeper dependencies.

**Benefits:**

- There's a clear delineation between expected and unexpected errors.
- Expected errors are typed, and TypeScript nudges the developer to handle them.
- If a function starts returning a new error type, consumers can be forced to handle it by using the `throw error satisfies never` pattern.
- By masking dependency exceptions, libraries protect against an entire category of nasty coupling.

**Example applications:**

- `@saflib/monorepo` provides a [`ReturnsError`](./monorepo/docs/ref/type-aliases/ReturnsError.md) type for such functions, and a [`throwError`](./monorepo/docs/ref/functions/throwError.md) helper function.
- `@saflib/drizzle`'s [query template](https://github.com/sderickson/saflib/blob/c5f310d2faa42bc84dd5530966d26f63c8086431/drizzle/workflows/query-template/template-file.ts) uses `ReturnsError`, and `@saflib/express`'s [route template](https://github.com/sderickson/saflib/blob/c5f310d2faa42bc84dd5530966d26f63c8086431/express/workflows/route-template/route-template.ts#L18-L26) demonstrates how to use it.

## Keep Files Small

This is most applicable to parts of the codebase where there are a number of the same thing, e.g. components, routes, handlers, pages, and database queries. Each of these should live in a single file, rather than being grouped by domain (such as all CRUD operations for a single entity in one file). If any single instance of those grows to a larger size, it should be broken up into smaller pieces, such as sub-components, library methods, or transactions which depend on smaller queries.

**Benefits:**

- Less necessary context for agents, scrolling for humans
- Edits are faster as there's less surface area for the agent to work with when making changes.
- Automated workflows on files, such as creating or updating a new route or page, can be done more easily by just providing a file path.

**Example application:**

- `@saflib/identity`'s [database queries](https://github.com/sderickson/saflib/tree/c5f310d2faa42bc84dd5530966d26f63c8086431/identity/identity-db/queries/email-auth), [Express handlers](https://github.com/sderickson/saflib/tree/c5f310d2faa42bc84dd5530966d26f63c8086431/identity/identity-http/routes/auth), and [OpenAPI specs](https://github.com/sderickson/saflib/tree/c5f310d2faa42bc84dd5530966d26f63c8086431/identity/identity-spec/routes/auth) break everything down into a single file apiece.

## Keep Code Modular

Software should be broken up into packages which have a well-defined purpose, a public interface, and an up-to-date list of dependencies. These packages should also not become too large in any of these regards.

**Benefits:**

- Similar to "Keep Files Small"; it limits the required context for humans or agents to work on one surface at a time.

**Example application:**

SAF itself is broken up into [a good number of monorepo packages](https://github.com/sderickson/saflib/tree/main) which are also listed in the sidebar of the [documentation](https://docs.saf-demo.online/).

## Specify and Enforce Shared APIs, Models, and Strings

Anything that is shared across system boundaries should have a clear, independent source of truth, and that source of truth should be enforced by every consumer, ideally by type checking or some other form of static analysis.

Assets to be owned by one package, shared with other packages, and enforced by static analysis across all usages include:

- URLs to product pages
- Product copy
- Product events
- HTTP/gRPC request and response objects
- Business models
- Environment variables

For serialized data, prefer flattened data stuctures with identifiers for related data rather than nested objects.

**Benefits:**

- Quick feedback when a shared contract changes which would break dependent code, such as what is written on a page or what pages there are in a SPA or what metadata a product event requires, showing how much work there is to do and where to do it.
- Sharing strings for product copy reduces the likelihood of typos and inconsistencies, shifting fixes left. This is particularly useful for tests which check that a given string exists in a UI, or needs to navigate to a given page.
- Flattened data structures allows for passing only the data that is needed, and avoids coupling those structures to the source, e.g. through one or several API calls, GraphQL, websockets, a cache, or other.

**Example applications:**

- `@saflib/links` provides [a simple structure](./links/docs/ref/type-aliases/Link.md) and some [methods](./links/docs/ref/index.md#functions) for sharing and using links to specific pages between packages.
- `@saflib/utils` provides an [interface](./utils/docs/ref/interfaces/ElementStringObject.md) for objects with textual HTML element properties which can be easily `v-bind`ed in a Vue template, and located by [Playwright](./playwright/docs/ref/functions/getByString.md).

## Build and Maintain Fakes and Adapters for Service Boundaries

Any non-trivial app will reach a point where it depends on separate services, either first or third party, and those integration points should provide fake implementations for consumers to use for testing. This allows consuming services and packages to have unit or integration tests which don't depend on a live or fully-featured service.

Fakes should be available for both frontend and backend testing. Packages that must provide fake implementations are:

- Frontend SDKs
- gRPC clients
- 3rd party integrations

A fake implementation should have:

- An in memory store so unsafe operations can be tested
- A set of store states (scenarios) which can be tested against, e.g. different subscription states for a mocked payment service

Beyond that, more complexity should only be added judiciously, such as consistency checks.

Third party integrations often provide more features than the product needs; the package or module responsible for integrating with that third-party service should adapt the interface to solely the needs of the product.

**Benefits:**

- Fakes and stubs are necessary to ensure any component can be tested (from unit through E2E) with confidence and speed.
- By limiting how complex they may become, the cost to maintain and understand them is bounded.
- An adapter helps control and manage how tightly coupled a product is to any third-party service, while also reducing the surface area that needs to be faked.

**Example application:**

- `@saflib/sdk` provides a [helper method](./sdk/docs/ref/@saflib/sdk/testing/functions/typedCreateHandler.md) for typing fake server handlers.

### On Ownership of Fakes

Fakes are often included with or adjacent to the test code that uses them out of expediency, but they should instead be part of the integration module or client package. In practice, test writers will write and contribute additional scenarios, but these should be kept and managed in a central location to reduce redundant work and updates when shared models change. And there's no reason for every consumer to have and maintain its own fake implementation.

## Have Thorough Test Coverage

Where possible test logic in pure functions with no dependencies.

In reality, this is often not practical, at least when it comes to web applications.

A solid automated test suite will include:

- Pure unit tests on library or utility code.
- Unit tests on database queries with an in-memory instance of the database.
- Integration tests for each operation such as web and gRPC endpoints, FSM states, and background jobs, with in-memory database instances and faked external and internal service dependencies.
- Integration (or component) tests for frontend web pages and components, where network requests are faked. Focus mainly on testing renders, not interactions.
- E2E tests with all external dependencies faked and all internal dependencies fully running.

Packages should be measured for how covered _their_ code is by _their_ tests. A majority of code should be tested at least, with at least one unit or integration test per file (component, endpoint, query, etc). These files should be immediately adjacent to the file they test (no separate "tests" directories).

Tests should stick to testing the package, API, or user interface they are targeting as much as possible. They should avoid reaching behind and checking, for example, database entries directly, because the tests should focus on the interface and not its dependencies. This is not a hard-and-fast rule however; here are some exceptions:

- Checking product events or key metrics are recorded correctly after a user behavior or endpoint call, to ensure analytics and monitoring don't break or become inaccurate.
- Viewing emails sent in order to make sure they do get sent, or to get some contents such as an email verification code, which are necessary for the test to continue.

**Benefits:**

- A great deal of peace of mind that the product continues to work as expected even when a great deal has changed.
- Generated code that is tested is far less likely to need to be reworked when used later in the process.
- For [automated, agentic workflows](./workflows.md), sufficient automated test coverage is required for workflow evals to work.

**Example application:**

- SAF packages often have testing-specific documentation, workflows, and/or exports to help enable greater and more consistent testing.

## Document the Codebase, Make it Accessible

There needs to be a source of truth for how to do things the right way specific to your stack, and the closer those decisions are to the code the better.

- **Reference** documentation should be generated from source, such as through [Typedoc](https://github.com/TypeStrong/typedoc) or [Redoc](https://github.com/Redocly/redoc).
- **Explanation** docs should live in the package they address, such as in markdown files in a separate `docs/` directory.
- **How-To Guides** are naturally expressed with [agentic workflows](./workflows.md), and human-readable versions should be generated from those.

**Benefits:**

- Written documentation provides a source of truth for how to do things the right way specific to your stack. Workflows can be developed toward and checked against them.
- If something is not documented, it can be assumed to be undecided.

**Example applications:**

- Each package in [the docs](https://docs.saf-demo.online/) has a mix of explanation docs and generated reference docs. Instead of maintaining them separately, how-to guides are effectively generated from workflows such as [this one](./drizzle/docs/workflows/add-queries.md).
- `@saflib/dev-tools` provides a [CLI tool](./dev-tools/docs/cli/saf-docs.md) for generating documentation from code, workflows, and CLI commands. For example, [this workflow](./drizzle/docs/workflows/add-queries.md) was generated from [this code](./drizzle/workflows/add-queries.ts).
