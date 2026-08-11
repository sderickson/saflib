# Sentry — manual setup (outside the repo)

After the code wiring is in place, a human still needs to configure Sentry and GitHub. UIs change; this is a loose checklist.

## 1. Sentry (sentry.io or your self-hosted URL)

1. Sign in and open your **organization**.
2. Create **projects** for each surface you use (e.g. separate projects for production vs dev, and for browser vs server, if you want them split).
3. For each project, open **Settings → Client Keys (DSN)** and copy the **DSN**. Put these into the right **environment** / **deploy config** for your app (not necessarily committed; use secrets or env files that are gitignored).
4. For **source maps** from CI, create an **organization auth token** (or a token Sentry documents for release uploads) with the scopes needed for releases and source map upload. You will use this as **`SENTRY_AUTH_TOKEN`** at build time only.

## 2. GitHub (or your CI)

1. In the **repository** → **Settings** → **Secrets and variables** (and **Environments** if you use them), add **`SENTRY_AUTH_TOKEN`** (or the name your workflow reads). Point your workflow job at that secret so **`deploy`/Docker builds** receive the token (see your workflow file).
2. If you use a named **Environment** (e.g. `CI`), attach the secret there and reference that environment from the workflow job so the secret is available during **`docker build`**.

## 3. Local developer machine

1. Optionally create **`<clients-build>/.env.sentry-build-plugin`** (path may differ in your repo) containing **`SENTRY_AUTH_TOKEN=...`** so local **`vite build`** can upload source maps. Keep this file **gitignored**.
2. Run **`saf-git-hashes`** (or your equivalent) before production builds so release/git metadata matches what you expect.

## 4. Sanity checks

1. Trigger a build that runs **`vite build`** with the token set; confirm **releases / artifacts** appear in Sentry for the right project.
2. Trigger a test error from the app and confirm the issue lands in the intended project with readable stack traces.

When anything breaks, use Sentry’s docs for **releases**, **source maps**, and **Vite** — their wizard labels move around over time.
