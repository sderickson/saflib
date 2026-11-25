import { describe, expect, it } from "vitest";
import { ID_PALETTE, idColor, idTint, shortId, tint } from "./id-color.ts";

describe("idColor", () => {
  it("is stable and comes from the palette", () => {
    const id = "3feea557-9bc0-475f-8130-a51c35fa4c91";
    expect(idColor(id)).toBe(idColor(id));
    expect(ID_PALETTE).toContain(idColor(id));
  });

  it("spreads ids across the palette", () => {
    const colors = new Set(
      Array.from({ length: 200 }, (_, i) => idColor(`req-${i}`)),
    );
    expect(colors.size).toBe(ID_PALETTE.length);
  });
});

describe("tint", () => {
  it("mixes toward white", () => {
    expect(tint("#000000", 0)).toBe("#000000");
    expect(tint("#000000", 1)).toBe("#ffffff");
    expect(tint("#3f6fd8", 0.5)).toBe("#9fb7ec");
  });
  it("gives a pale avatar background", () => {
    expect(idTint("x")).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("shortId", () => {
  it("keeps four characters with a prefix", () => {
    expect(shortId("7f3a91c2-0000-4000-8000-000000000000", "r")).toBe("r·7f3a");
    expect(shortId("nFIiqA2B", "j")).toBe("j·nFIi");
  });
  it("uses the part after a kind prefix", () => {
    expect(shortId("ops_token:a1b2c3", "t")).toBe("t·a1b2");
  });
  it("works without a prefix", () => {
    expect(shortId("abcdef")).toBe("abcd");
  });
});
