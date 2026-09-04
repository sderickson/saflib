# Overview

`@saflib/vite` provides a function for making a vite config for the mix of libraries that SAF depends on, and the way they're organized and served.

The vite config includes:

- Uses the `CLIENT_SUBDOMAINS` environment variable to determine which subdomains get built and developed.
- A mix of `spa` and `mpa` vite [appType](https://vite.dev/config/shared-options.html#apptype). The config is technically in `mpa` to allow multiple entrypoints, but that lacks the `spa` fallback in development, so the vite config also includes a fallback plugin.
- Plugins for vuetify, vue, and vue-devtools.
