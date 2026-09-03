# saf-lock-prune

Prune stale workspace entries from the product `package-lock.json`, remove
product declarations of npm packages saflib already owns, and hoist misplaced
peer dependencies from `saflib/node_modules` to the product root in the
lockfile.

Run from the product root:

```bash
npm run lock-prune
```

Use `--yes` to apply fixes without prompting.

After fixes are applied, run `npm install` from the product root.
