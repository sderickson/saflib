import { __serviceName__Handler } from "../../typed-fake.ts";

// BEGIN ONCE WORKFLOW AREA instructions FOR sdk/add-mutation IF upload
/*
For file-upload fakes, the handler receives the request (multipart body). Return a plausible response
without reading the file. Example pattern: use a helper for predictable IDs/timestamps, build a
response object that matches the spec (e.g. id, message, parts_created or similar), and if there
is shared list state (like mockPartSources), push a new item so list queries see the new resource.
*/
// END WORKFLOW AREA

export const __mutationName____GroupName__Handler = __serviceName__Handler({
  verb: "post",
  path: "/__group-name__/__mutation-name__",
  status: 200,
  // @ts-expect-error TODO: update verb, path, status, and handler to match the endpoint
  handler: async (req) => {
    return {};
  },
});
