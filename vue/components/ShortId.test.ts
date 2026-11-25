import { describe, expect, it, vi } from "vitest";
import { mountWithPlugins } from "../testing/mount.ts";
import ShortId from "./ShortId.vue";

describe("ShortId", () => {
  it("shows the prefix and four characters, and copies the full id", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const id = "7f3a91c2-0000-4000-8000-000000000000";
    const wrapper = mountWithPlugins(ShortId, { props: { id, prefix: "r" } });
    const button = wrapper.find('[data-test="short-id"]');
    expect(button.text()).toBe("r·7f3a");
    await button.trigger("click");
    expect(writeText).toHaveBeenCalledWith(id);
  });
});
