import { expect, it, describe } from "vitest";
import { vuetifyConfig } from "template-package-clients-common";
import { __product_name___common_strings } from "template-package-clients-common/strings";

describe("__product-name__-clients-common package exports", () => {
  it("should export vuetify config", () => {
    expect(vuetifyConfig).toBeDefined();
  });

  it("should export strings", () => {
    expect(__product_name___common_strings).toBeDefined();
  });
});
