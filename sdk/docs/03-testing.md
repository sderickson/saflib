# Testing TanStack Functions

The main thing to test with your Tanstack functions is the caching behavior. Individual functions don't very much need to be tested, since they are simply thin wrappers around API calls. But caching is always a tricky thing to get right, so it's important to make sure your query keys are behaving as intended.

To easily test a Tanstack function, use the [`useQuery` composable](./ref/testing/functions/withVueQuery.md). The Tanstack functions won't work without it because they expect to run within a Vue setup function. See [testing composables](https://vuejs.org/guide/scaling-up/testing.html#testing-composables); `useVueQuery` is similar to the example there, along with creating and providing a Tanstack Query client with retries turned off for testing network errors.

You can create your own Tanstack Query client and provide it to `withVueQuery`, but it's not necessary as long as you are using the provided [fake system](./04-fakes.md). Rather than mocking the Vue Query client, a service worker intercepts network requests, so tests can have one or many clients; they will still work.
