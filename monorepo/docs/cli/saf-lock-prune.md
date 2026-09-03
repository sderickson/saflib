# saf-lock-prune

Prune stale workspace entries from the product `package-lock.json`, verify that
`saflib/node_modules` is not being used as an install target, and flag product
packages that declare npm dependencies saflib already owns.

Run from the product root:

```bash
npm run lock-prune
```

Use `--yes` to apply fixes without prompting.

After fixes are applied, run `npm install` from the product root.
