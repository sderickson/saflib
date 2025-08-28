# Best Practices

The following are rules that should be followed for _any_ software stack that aims to enable both human and AI agents work quickly and effectively, given that [what is good for one tends to be good for the other](https://scotterickson.info/blog/2025-04-18-Theory-of-Dx). SAF is how I identify, develop and exemplify these rules. This is a living document, and other documentation in this repository will reference these rules when they are applied.

## Embrace Type Safety at Every Layer

Many of the following rules depend on the stack having a type system. Any stack that does not provide a way to type and enforce _every_ interface in the stack (including APIs and environment variables) will be fundamentally hampered, as static analysis provides an immediate and reliable feedback loop which is critical for rapid and reliable development.

**Example applications:**

- [`@saflib/drizzle`](./drizzle/docs/01-overview.md) relies heavily on Drizzle's [Type API](https://orm.drizzle.team/docs/goodies#type-api)
- [`@saflib/express`](./express/docs/03-routes.md#typing-the-interface) and [`@saflib/sdk`](./sdk/docs/02-requests.md#creating-a-typed-client) provide documentation and utilities to enforce types generated with [`@saflib/openapi`](./openapi/docs/cli/saf-specs.md)
- [`@saflib/vue`](./vue/docs/03-i18n.md#why) flips how vue-i18n typically works, so that translated strings become typechecked
- [`@saflib/playwright`](./playwright/docs/overview.md#string-locators) provides a custom locator that takes typed objects to ensure tests and the components they test render and check for the same strings
- [`@saflib/env`](./env/docs/overview.md) allows typing and validating environment variables

## Pass Objects

For complex function signatures, arguments should be passed in as objects. Even if you are adding the first and only parameter to start, wrap it in an object so that if more options are added later, the function signature does not need to change.

```typescript
// Bad
function createUser(
  name: string,
  email: string,
  age: number,
  isAdmin: boolean,
) {}

// Good
function createUser({ name, email, age, isAdmin }: CreateUserParams) {}
```

**Benefits:**

- Arguments passed into functions are more explicit and easier to understand without investigating the function signature or documentation, reducing the context window size and need to navigate around the codebase.
- Adding further (optional) arguments does not require changing calls to the function.

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

The types of Errors returned should be created, managed, and exported by the package. Propagating downstream errors (such as from a dependency like a database error) upstream is a form of tight coupling. Even unhandled errors should be caught at the package or service boundary and obfuscated (such as a generic "UnhandledError") to ensure consumers _cannot_ tie themselves to deeper dependencies.

**Benefits:**

- There's a clear delineation between expected and unexpected errors.
- Expected errors are typed, and TypeScript nudges the developer to handle them.
- If a function starts returning a new error type, consumers can be forced to handle it by using the `throw error satisfies never` pattern.
- By masking dependency exceptions, libraries protect against an entire category of nasty coupling.

**Example applications:**

- `@saflib/monorepo` provides a [`ReturnsError`](./monorepo/docs/ref/type-aliases/ReturnsError.md) type for such functions, and a [`throwError`](./monorepo/docs/ref/functions/throwError.md) helper function.
- `@saflib/drizzle`'s [query template](https://github.com/sderickson/saflib/blob/c5f310d2faa42bc84dd5530966d26f63c8086431/drizzle/workflows/query-template/template-file.ts) uses `ReturnsError`, and `@saflib/express`'s [route template](https://github.com/sderickson/saflib/blob/c5f310d2faa42bc84dd5530966d26f63c8086431/express/workflows/route-template/route-template.ts#L18-L26) demonstrates how to use it.

## Name Well

Give functions, types, parameters, and returned objects concise, clear, and consistent names. Shared semantic meaning can help, but mostly this comes down to practicing good writing and communication.

**Benefits:**

- Like with Pass Objects, this reduces the context window size and need to navigate around the codebase.
- If a name is vague and also undocumented, its purpose or value may be unclear and used counter to the original intent.

## Keep Files Small

This is most applicable to parts of the codebase where there are a number of the same thing, e.g. components, routes, handlers, pages, and database queries. Each of these should live in a single file, rather than being grouped by domain (such as all CRUD operations for a single entity in one file). If any single instance of those grows to a larger size, it should be broken up into smaller pieces, such as sub-components, library methods, or transactions which depend on smaller queries.

**Benefits:**

- Less necessary context for agents, scrolling for humans
- Edits are faster as there's less surface area for the agent to work with when making changes.
- Automated workflows on files, such as creating or updating a new route or page, can be done more easily by just providing a file path.

**Example application:**

- `@saflib/identity`'s [database queries](https://github.com/sderickson/saflib/tree/c5f310d2faa42bc84dd5530966d26f63c8086431/identity/identity-db/queries/email-auth) and [Express handlers](https://github.com/sderickson/saflib/tree/c5f310d2faa42bc84dd5530966d26f63c8086431/identity/identity-http/routes/auth), and [OpenAPI specs](https://github.com/sderickson/saflib/tree/c5f310d2faa42bc84dd5530966d26f63c8086431/identity/identity-spec/routes/auth) break everything down into a single file apiece.

## Keep Code Modular

Software should be broken up into packages which have a well-defined purpose, a public interface, and an up-to-date list of dependencies. These packages should also not become too large in any of these regards.

**Benefits:**

- Similar to "Keep Files Small"; it limits the required context for humans or agents to work on one surface at a time.

**Example application:**

SAF itself is broken up into [a good number of monorepo packages](https://github.com/sderickson/saflib/tree/main) which are also listed in the sidebar of the [documentation](https://docs.saf-demo.online/).

## Specify and Enforce Shared APIs, Models, and Strings

Anything that is shared across system boundaries should have a clear, independent source of truth, and that source of truth should be enforced by every consumer, ideally by static analysis or type checking.

Assets to be owned by one package, shared with other packages, and enforced by static analysis across all usages include:

- URLs to product pages
- Strings
- Product events
- HTTP/gRPC request and response objects
- Business models
- Environment variables
- Configuration objects

For serialized data, prefer flattened data stuctures with identifiers for related data rather than nested objects.

**Benefits:**

- Quick feedback when a shared contract changes which would break dependent code, showing how much work there is to do and where to do it.
- Shared strings reduce the likelihood of typos and inconsistencies, shifting fixes left. This is particularly useful for tests which check that a given string exists in a UI, or needs to navigate to a given page.
- Flattened data structures allows for passing only the data that is needed, and avoids coupling those structures to how it was transported (e.g. through one or several API calls).

**Example applications:**

- `@saflib/links` provides [a simple structure](./links/docs/ref/type-aliases/Link.md) and some [methods](./links/docs/ref/index.md#functions) for sharing links to specific pages between packages.
- `@saflib/utils` provides an [interface](./utils/docs/ref/interfaces/ElementStringObject.md) for easy use by Vue and consumption by [Playwright](./playwright/docs/ref/functions/getByString.md)

## Build and Maintain Fakes, Stubs, and Adapters for Service Boundaries

Any non-trivial app will reach a point where it depends on separate services, either first or third party, and those integration points should provide fakes and stubs for consumers to use for testing. This allows consuming services and packages to have unit or integration tests which don't depend on a live or fully-featured service.

Fakes (which are working, simplified implementations of a service) should be available for backend testing. Stubs (which are sample data of the form returned by a service) should be available for frontend testing. The frontend does not need a fully-featured fake because complex interactions are best covered through E2E tests, where the fakes will be used in the backend.

Third party integrations often provide more features than the product needs; the package or module responsible for integrating with that third-party service should adapt the interface to solely the needs of the product.

**Example application:**

- `@saflib/sdk` provides a [helper method](./sdk/docs/ref/@saflib/sdk/testing/functions/typedCreateHandler.md) for typing fake server handlers.

**Benefits:**

- Fakes and stubs are necessary to ensure any component can be tested (from unit through E2E) with confidence and speed.
- An adapter helps control and manage how tightly coupled a product is to any third-party service, while also reducing the surface area that needs to be faked.

### Ownership of Mocks, Fakes, Shims

Fakes and stubs are often included with or adjacent to the test code that uses them, but they should instead be part of the integration module or package. In practice, test writers will write and contribute most of them, but these should be kept and managed in a central location to reduce redundant work and updates when shared models change.

## Have Thorough Test Coverage

Where possible test logic in pure functions with no dependencies.

In reality, this is often not practical, at least when it comes to web applications.

A solid automated test suite will include:

- Pure unit tests on library or utility code.
- Unit tests on database queries with an in-memory instance of the database.
- Integration tests for each operation such as web and grpc endpoints, FSM states, and background jobs, with in-memory database instances and faked external and internal service dependencies.
- Integration (or component) tests for frontend web pages and components, where network requests are faked. Focus mainly on testing renders, not interactions.
- E2E tests with all external dependencies faked and all internal dependencies fully running.

Packages should be measured for how covered _their_ code is by _their_ tests. A majority of code should be tested at least, with at least one unit or integration test per file (component, endpoint, query, etc). These files should be immediately adjacent to the file they test (no separate "tests" directories).

Tests should stick to testing the package, API, or user interface they are targeting as much as possible. They should avoid reaching behind and checking, for example, database entries directly, because the tests should focus on the interface and not its dependencies. This is not a hard-and-fast rule however; here are some exceptions:

- Checking product events or key metrics are recorded correctly after a user behavior or endpoint call, to ensure analytics and monitoring don't break.
- Viewing emails sent in order to make sure they do get sent, or to get some contents such as an email verification code, which are necessary for the test to continue.

## Document Technical Decisions In the Codebase

There needs to be a source of truth for how to do things the right way specific to your stack, and the closer those decisions are to the code the better.

- **Reference** documentation should be generated from source, such as through [Typedoc](https://github.com/TypeStrong/typedoc) or [Redoc](https://github.com/Redocly/redoc).
- **Explanation** and **Tutorial** docs should live in the package they address, such as in markdown files in a separate `docs/` directory.
- **How-To Guides** are great fodder for agentic workflows, and human-readable versions should be generated from those.

The above types of docs are defined by [Diátaxis](https://diataxis.fr/).

**Example application:**

Each package in [the docs](https://docs.saf-demo.online/) has a mix of explanation docs and generated reference docs. Instead of maintaining them separately, how-to guides are effectively generated from workflows such as [this one](./drizzle/docs/workflows/add-queries.md).

## Commit Human-Readable Generated Files to the Repo

Where it makes sense, commit generated files to the repo. To help decide, ask:

- Would it be helpful to see while navigating the codebase through the browser such as on GitHub?
- Can they be used as context for agentic workflows?
- Does it provide useful information in a code review when it changes?
- Do they _need_ to exist in the file system in order for the system to work in development?

As long as the files themselves aren't too large or difficult to read, "Yes" answers suggest they should be committed to the repo. The extra repo size and code review context are often worth the above benefits. Make sure to have Prettier or similar running automatically so formatting doesn't create noise.
