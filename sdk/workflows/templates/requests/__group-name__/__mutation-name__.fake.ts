import { __serviceName__Handler } from "../../typed-fake.ts";

// @ts-expect-error TODO: use mock data
import { mock__GroupName__ } from "./mocks.ts";
// For create mutations, push a new item. For delete, splice it out. For update, modify in place.

// BEGIN ONCE WORKFLOW AREA instructions FOR sdk/add-mutation IF upload
/*
For file-upload fakes, the handler receives the request (multipart body). Return a plausible response
without reading the file. Example pattern: use a helper for predictable IDs/timestamps, build a
response object that matches the spec (e.g. id, message, parts_created or similar), and if there
is shared list state (like mockPartSources), push a new item so list queries see the new resource.
*/
// END WORKFLOW AREA

// BEGIN ONCE WORKFLOW AREA instructions FOR sdk/add-mutation IF download
/*
For download fakes, return a stub binary (e.g. Buffer or Uint8Array). The handler can set
Content-Type and send the buffer; keep it small for tests (e.g. a few bytes).
*/
// END WORKFLOW AREA

export const __mutationName____GroupName__Handler = __serviceName__Handler({
  verb: "__method__",
  path: "__url-path__",
  status: 200,
  // @ts-expect-error TODO: update status and handler to match the endpoint
  handler: async (req) => {
    return {};
  },
});
