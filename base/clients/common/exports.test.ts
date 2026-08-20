import { expect, it, describe } from "vitest";
import { vuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import { base_common_strings } from "@saflib/base-clients-common/strings";

describe("templates-clients-common package exports", () => {
  it("should export vuetify config", () => {
    expect(vuetifyConfig).toBeDefined();
  });

  it("should export strings", () => {
    expect(base_common_strings).toBeDefined();
  });
});
