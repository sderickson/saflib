// TODO: uncomment lines below, and update imports to actual files if needed
import {
  describe,
  it,
  expect,
  //  vi
} from "vitest";
import { stubGlobals, setupMockServer } from "@saflib/vue-spa/testing";
// import TemplateFileAsync from "./TemplateFileAsync.vue";
// import { TemplateFile_page as strings } from "./TemplateFile.strings.ts";
// import { getElementByString } from "@saflib/vue-spa/testing";
import { http, HttpResponse } from "msw";
import type { AuthResponse } from "@saflib/identity-spec"; // TODO: import the appropriate spec
// import { mountTestApp } from "../../test-app.ts";

// TODO: update with mock responses for the actual API calls made in the loader
const handlers = [
  http.get("http://identity.localhost:3000/users", () => {
    return HttpResponse.json([] satisfies AuthResponse["listUsers"]["200"]); // TODO: enforce the correct response type
  }),
];

describe("TemplateFile", () => {
  stubGlobals();

  const server = setupMockServer(handlers);
  expect(server).toBeDefined();
  /*
    For tests which test different responses, use the following pattern:
      server.use(
      http.get("http://identity.localhost:3000/users", () => {
        return HttpResponse.json(updatedResponse);
      }),
    );
  */

  it("should render the example strings", async () => {
    // const wrapper = mountTestApp(TemplateFileAsync);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    // await vi.waitFor(() => getTitle(wrapper).exists());
    // expect(getElementByString(wrapper, strings.title).exists()).toBe(true);
    // expect(getElementByString(wrapper, strings.example_input).exists()).toBe(true);
    // TODO: add a check for the raw, printed data from the loader
  });
});
