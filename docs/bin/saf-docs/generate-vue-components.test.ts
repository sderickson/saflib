import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import type { ComponentMeta } from "vue-component-meta";
import {
  extractComponentDescriptionFromSource,
  findDefinedModels,
  renderComponentMarkdown,
  renderComponentsIndex,
} from "./generate-vue-components.ts";

const baseMeta = (): ComponentMeta => ({
  description: "Example component description.",
  type: 1,
  props: [],
  events: [],
  slots: [],
  exposed: [],
});

describe("findDefinedModels", () => {
  it("detects modelValue and matching update events", () => {
    const meta: ComponentMeta = {
      ...baseMeta(),
      props: [
        {
          name: "modelValue",
          description: "Bound value",
          type: "string",
          required: false,
          global: false,
          tags: [],
          schema: "string",
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => {
            throw new Error("not implemented");
          },
        },
        {
          name: "label",
          description: "Field label",
          type: "string",
          required: false,
          global: false,
          tags: [],
          schema: "string",
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => {
            throw new Error("not implemented");
          },
        },
      ],
      events: [
        {
          name: "update:modelValue",
          description: "Emitted when the value changes",
          type: "[value: string]",
          signature: "(value: string) => void",
          tags: [],
          schema: [],
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => undefined,
        },
      ],
    };

    expect(findDefinedModels(meta)).toEqual([
      expect.objectContaining({ name: "modelValue" }),
    ]);
  });
});

describe("extractComponentDescriptionFromSource", () => {
  it("reads the leading script block comment from a vue file", () => {
    const description = extractComponentDescriptionFromSource(
      fileURLToPath(
        new URL(
          "../../../../vue/components/UsPhoneNumberInput.vue",
          import.meta.url,
        ),
      ),
    );
    expect(description).toContain("US phone number input");
  });
});

describe("renderComponentMarkdown", () => {
  it("renders models, props, emits, slots, and exposed sections", () => {
    const meta: ComponentMeta = {
      ...baseMeta(),
      props: [
        {
          name: "modelValue",
          description: "E.164 phone number",
          type: "string",
          default: '""',
          required: false,
          global: false,
          tags: [],
          schema: "string",
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => {
            throw new Error("not implemented");
          },
        },
        {
          name: "label",
          description: "Visible label",
          type: "string",
          default: '"Phone Number"',
          required: false,
          global: false,
          tags: [],
          schema: "string",
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => {
            throw new Error("not implemented");
          },
        },
      ],
      events: [
        {
          name: "update:modelValue",
          description: "Emitted when the E.164 value changes",
          type: "[value: string]",
          signature: "(value: string) => void",
          tags: [],
          schema: [],
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => undefined,
        },
      ],
      slots: [
        {
          name: "default",
          description: "Optional inner content",
          type: "{}",
          tags: [],
          schema: "{}",
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => {
            throw new Error("not implemented");
          },
        },
      ],
      exposed: [
        {
          name: "focus",
          description: "Focus the input",
          type: "() => void",
          tags: [],
          schema: { kind: "event", type: "() => void" },
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => {
            throw new Error("not implemented");
          },
        },
      ],
    };

    const markdown = renderComponentMarkdown(
      meta,
      "UsPhoneNumberInput",
      "components/UsPhoneNumberInput.vue",
    );

    expect(markdown).toContain("# UsPhoneNumberInput");
    expect(markdown).toContain("Example component description.");
    expect(markdown).toContain("## Models");
    expect(markdown).toContain("E.164 phone number");
    expect(markdown).toContain("## Props");
    expect(markdown).toContain("Visible label");
    expect(markdown).not.toContain("## Emits");
    expect(markdown).toContain("## Slots");
    expect(markdown).toContain("Optional inner content");
    expect(markdown).toContain("## Exposed");
    expect(markdown).toContain("Focus the input");
  });

  it("escapes characters that break VitePress vue markdown rendering", () => {
    const meta: ComponentMeta = {
      ...baseMeta(),
      props: [
        {
          name: "beforeSubmit",
          description: "Uses `@submit.prevent` in the SPA",
          type: "((value: string) => Promise<string | null>) | undefined",
          required: false,
          global: false,
          tags: [],
          schema: "string",
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => {
            throw new Error("not implemented");
          },
        },
      ],
      slots: [
        {
          name: "fieldset",
          description: "Layout override",
          type: "{ displayNodes: readonly UiNode[]; allNodeIndices: readonly number[]; }",
          tags: [],
          schema: "{}",
          declarations: [],
          getDeclarations: () => [],
          getTypeObject: () => {
            throw new Error("not implemented");
          },
        },
      ],
    };

    const markdown = renderComponentMarkdown(
      meta,
      "ExampleForm",
      "components/ExampleForm.vue",
    );

    expect(markdown).toContain("Promise&lt;string | null&gt;");
    expect(markdown).toContain(
      "&#123; displayNodes: readonly UiNode[]; allNodeIndices: readonly number[]; &#125;",
    );
    expect(markdown).toContain("`@submit.prevent`");
  });
});

describe("renderComponentsIndex", () => {
  it("links to each component page", () => {
    const markdown = renderComponentsIndex([
      { name: "SpaLink", description: "Simple link component" },
    ]);

    expect(markdown).toContain("[SpaLink](SpaLink.md)");
    expect(markdown).toContain("Simple link component");
  });
});
