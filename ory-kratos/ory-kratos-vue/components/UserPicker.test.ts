import { describe, expect, it, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import UserPicker from "./UserPicker.vue";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";
const ID = "3feea557-9bc0-475f-8130-a51c35fa4c91";
const searches: string[] = [];

describe("UserPicker", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/admin/identities`, ({ request }) => {
      searches.push(new URL(request.url).searchParams.get("q") ?? "");
      return HttpResponse.json({
        identities: [{ id: ID, email: "ada@example.com", name: "Ada Lovelace", verified: true, state: "active", created_at: "2026-01-01T00:00:00Z", org: null, role: null, mfa: true, last_sign_in_at: null }],
        next_cursor: null,
        total: 1,
      });
    }),
  ]);

  it("searches users as you type and emits the picked id", async () => {
    const wrapper = mountTestApp(UserPicker, { props: { modelValue: null } });
    const auto = wrapper.findComponent({ name: "v-autocomplete" });
    await auto.vm.$emit("update:search", "ada");
    await vi.waitFor(() => expect(searches).toContain("ada"), { timeout: 2000 });
    await vi.waitFor(() => expect(auto.props("items")).toContainEqual({ id: ID, title: "Ada Lovelace", subtitle: "ada@example.com" }));
    await auto.vm.$emit("update:modelValue", ID);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([ID]);
    wrapper.unmount();
  });
});
