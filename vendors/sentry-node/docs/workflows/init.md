# sentry/init

## Source

[init.ts](../../workflows/init.ts)

## Usage

From the **repository root** (or any cwd; the workflow uses `cwd` from the CLI):

```bash
npm exec saf-workflow kickoff sentry/init
```

Or from `@saflib/vendors-sentry-node`:

```bash
cd saflib/vendors/sentry-node && npm exec saf-workflow kickoff sentry/init
```

Tell the agent to run this workflow when onboarding **Sentry** for a SAF-style monorepo: it drives **code changes**, then points operators at **[manual setup](../manual-setup.md)** for browser-only steps.

## Checklist

- Prompt the agent with concrete areas to edit (GitHub Actions, Vite/Docker, `@saflib/vendors-sentry-node/vite-build`, `@saflib/vendors-sentry-client`, secrets).
- Prompt the human to read **`docs/manual-setup.md`** for Sentry org projects, DSNs, tokens, and GitHub secrets.

## Help docs

```text
Usage: npm exec saf-workflow kickoff sentry/init

Wire up Sentry for Vue source maps and Node; align CI/Docker with build secrets.

Arguments: (none)
```
