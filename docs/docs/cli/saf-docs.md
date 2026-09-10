# saf-docs

```
Usage: saf-docs [options] [command]

Lookup and generation tool for SAF documentation.

Options:
  -h, --help              display help for command

Commands:
  generate                Generate typedoc and CLI docs for the current package.
  generate-all [options]  Generate documentation for all packages in the monorepo that have a docs
     directory
  cleanup-declarations    Remove emitted .d.ts and .d.ts.map files left in
                          package source trees.
  print                   List all packages in the monorepo.
  help [command]          display help for command
```

## Subcommands

- [generate](./saf-docs/generate.md)
- [generate-all](./saf-docs/generate-all.md)
- [cleanup-declarations](./saf-docs/cleanup-declarations.md)
- [print](./saf-docs/print.md)
