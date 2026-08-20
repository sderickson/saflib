import { expect, it, describe } from "vitest";
import { vuetifyConfig } from "@saflib/templates-clients-common/vuetify-config";
import { templates_common_strings } from "@saflib/templates-clients-common/strings";

describe("templates-clients-common package exports", () => {
  it("should export vuetify config", () => {
    expect(vuetifyConfig).toBeDefined();
  });

  it("should export strings", () => {
    expect(templates_common_strings).toBeDefined();
  });
});
