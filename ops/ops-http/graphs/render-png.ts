import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import { FONT_FAMILY } from "./render-svg.ts";

const require = createRequire(import.meta.url);
// Production images have no system fonts; bundle one (Bitstream Vera license).
const fontFile = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const boldFontFile = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");

/** Rasterize a graph SVG at 2x, with the bundled font only. */
export function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: 2 },
    font: {
      fontFiles: [fontFile, boldFontFile],
      loadSystemFonts: false,
      defaultFontFamily: FONT_FAMILY,
    },
  });
  return resvg.render().asPng();
}
