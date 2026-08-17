import { describe, expect, it } from "vitest";
import {
  extractVueSfc,
  extractVueScript,
  isVueSfc,
} from "./extract-vue-sfc.ts";

const listSfc = `
<template>
  <div @click="emit('edit', profile)" />
</template>
<script setup lang="ts">
import type { InterpreterProfile } from "./types.ts";

defineProps<{
  profiles: InterpreterProfile[];
}>();

const emit = defineEmits<{
  edit: [profile: InterpreterProfile];
  delete: [profile: InterpreterProfile];
  "update:scope": [scope: string];
}>();
</script>
`;

describe("isVueSfc", () => {
  it("detects template + script", () => {
    expect(isVueSfc(listSfc)).toBe(true);
    expect(isVueSfc("export function foo() {}")).toBe(false);
  });
});

describe("extractVueScript", () => {
  it("returns the script body without tags", () => {
    expect(extractVueScript(listSfc)).toContain("defineProps");
    expect(extractVueScript(listSfc)).not.toContain("<template");
  });
});

describe("extractVueSfc", () => {
  it("extracts typed defineProps and defineEmits", () => {
    const { props, emits } = extractVueSfc(listSfc);
    expect(props.map((p) => p.name)).toEqual(["profiles"]);
    expect(props[0]!.kind).toBe("prop");
    expect(props[0]!.signature).toContain("InterpreterProfile");
    expect(emits.map((e) => e.name)).toEqual([
      "edit",
      "delete",
      "update:scope",
    ]);
    expect(emits[0]!.kind).toBe("emit");
    expect(emits[0]!.signature).toContain("InterpreterProfile");
  });

  it("resolves defineProps<Props>() to a local interface", () => {
    const source = `
<template><div /></template>
<script setup lang="ts">
interface Props {
  loader?: () => unknown;
  pageComponent: unknown;
}
const props = defineProps<Props>();
</script>
`;
    const { props } = extractVueSfc(source);
    expect(props.map((p) => p.name)).toEqual(["loader", "pageComponent"]);
    expect(props[0]!.signature).toContain("unknown");
  });

  it("unwraps withDefaults(defineProps<...>())", () => {
    const source = `
<template><div /></template>
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    subdomain: string;
    hubPath?: string;
  }>(),
  { hubPath: "/" },
);
</script>
`;
    const { props } = extractVueSfc(source);
    expect(props.map((p) => p.name)).toEqual(["subdomain", "hubPath"]);
  });

  it("reads runtime props / emits arrays", () => {
    const source = `
<template><div /></template>
<script setup>
const props = defineProps({
  foo: { type: String, required: true },
  bar: Number,
});
defineEmits(["click", "update:modelValue"]);
</script>
`;
    const { props, emits } = extractVueSfc(source);
    expect(props.map((p) => p.name)).toEqual(["foo", "bar"]);
    expect(props[0]!.signature).toContain("String");
    expect(emits.map((e) => e.name)).toEqual(["click", "update:modelValue"]);
  });

  it("extracts defineModel binding name, type, and required", () => {
    const source = `
<template><input /></template>
<script setup lang="ts">
import type { ProfileContactFieldsValues } from "./types.ts";

const contact = defineModel<ProfileContactFieldsValues>({ required: true });
const title = defineModel<string>("title");
defineModel<boolean>();
</script>
`;
    const { models } = extractVueSfc(source);
    expect(models.map((m) => m.name)).toEqual(["contact", "title", "modelValue"]);
    expect(models[0]!.kind).toBe("model");
    expect(models[0]!.signature).toBe("ProfileContactFieldsValues, required");
    expect(models[1]!.signature).toBe("string");
    expect(models[2]!.signature).toBe("boolean");
  });

  it("reads the first template tag as rootTag", () => {
    expect(extractVueSfc(listSfc).rootTag).toBe("div");
    const dialog = `
<template>
  <!-- settings -->
  <v-dialog :model-value="open">
    <v-card />
  </v-dialog>
</template>
<script setup>
defineProps<{ open: boolean }>();
</script>
`;
    expect(extractVueSfc(dialog).rootTag).toBe("v-dialog");
  });
});
