# Overview

I'm using [XState](https://stately.ai/docs) in SAF for:

- Developer Workflows (`@saflib/workflows`)
- Backend Product Processes (no example in saflib yet)

I'm still figuring out the best way to use it, though. There's a lot going on in that library by itself, and getting types to do what I want with them is a bit of a challenge.

For `@saflib/workflows`, having each workflow use the entire XState interface is fairly complex, because there's a great deal of shared boilerplate. I'll probably end up completely hiding the XState interface for developer workflows just to provide a simpler interface.

For backend processes, when one begins I set up the machine to store snapshots in a row in the database, then have a subsystem (such as http, grpc, cron, or eventually async tasks) load that machine and continue it. In this way it provides a solid way to run complex product workflows.

## Future Work

I'm going to keep messing around with XState. It _does_ provide a bunch of features I like, and as I go I'll add more shared, opinionated code in this package. Some areas that could use filling in:

- Helper that provides SAF context
- Various variables and functions for integrating with a drizzle table which has some set of expected columns
- Guidance and workflows for organizing a machine into multiple files
- Guidance and workflows for testing a machine
