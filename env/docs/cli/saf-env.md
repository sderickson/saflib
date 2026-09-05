# saf-env

```
Usage: saf-env [options] [command]

Specify, share, and enforce environment variables

Options:
  -h, --help          display help for command

Commands:
  print
  generate [options]  Generate env.ts. Pass --combined to also generate
                      env.schema.combined.json.
  generate-all        Generate env.ts files for all packages that have existing
                      env files
  help [command]      display help for command
```

## Subcommands

- [generate](./saf-env/generate.md)
- [generate-all](./saf-env/generate-all.md)
