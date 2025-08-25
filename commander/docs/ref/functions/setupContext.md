[**@saflib/commander**](../index.md)

***

# Function: setupContext()

> **setupContext**(`options`, `callback`): `void`

Builds and runs the `@saflib/node` context and reporter storage for your CLI commands.

To use, wrap this function around your `parse` call like this:

```ts
import { Command } from "commander";
const program = new Command()
  .name("my-cli-tool")
  .description("My CLI tool");

// ... rest of commander setup

setupContext({ serviceName: "my-cli-tool" }, () => {
  program.parse(process.argv);
});
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`SetupContextOptions`](../interfaces/SetupContextOptions.md) |
| `callback` | () => `void` |

## Returns

`void`
