# sentry/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/vendors/sentry-node/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff sentry/init
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

Kicking off workflow sentry/init

- Implement Sentry integration for this monorepo (adapt paths/package names to the repo). Operators should later follow **/Users/scotterickson/src/saf-2025/saflib/vendors/sentry-node/docs/manual-setup.md** for browser-only steps.
- Run `echo Human operator: open and follow /Users/scotterickson/src/saf-2025/saflib/vendors/sentry-node/docs/manual-setup.md — Sentry projects, DSNs, auth token, GitHub secrets. No further agent steps unless something failed above.`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff sentry/init

Wire up Sentry for Vue source maps and Node; align CI/Docker with build secrets

Arguments:

```
