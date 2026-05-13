// Converts <text> elements in postcard-back.svg to <path> elements.
// Run once: node scripts/text-to-paths.js
// After running, no font is needed at render time (sharp/librsvg compatibility).

const opentype = require("opentype.js");
const fs = require("fs");
const path = require("path");

const FONT_PATH = path.join(__dirname, "../public/fonts/neumarkt-regular-v01.woff");
const SVG_PATH = path.join(__dirname, "../public/postcard-back.svg");
const FONT_SIZE = 9;

const FILL_BY_CLASS = {
  "cls-26": "#e6007e",
  "cls-27": "#009fe3",
  "cls-28": "#e6007e",
  "cls-29": "#009fe3",
  "cls-30": "#009fe3",
};

const TEXT_PATTERN =
  /<text\s+class="(cls-\d+)"\s+transform="translate\(([^)]+)\)"><tspan[^>]*>([^<]*)<\/tspan><\/text>/g;

function main() {
  const buf = fs.readFileSync(FONT_PATH);
  const font = opentype.parse(buf.buffer);

  let svg = fs.readFileSync(SVG_PATH, "utf-8");

  svg = svg.replace(TEXT_PATTERN, (_match, cls, translate, text) => {
    const [tx, ty] = translate.trim().split(/\s+/).map(Number);
    const fill = FILL_BY_CLASS[cls] || "#000000";
    const pathData = font.getPath(text, tx, ty, FONT_SIZE).toPathData(3);
    return `<path fill="${fill}" d="${pathData}"/>`;
  });

  fs.writeFileSync(SVG_PATH, svg, "utf-8");
  console.log("Done: text elements converted to paths in postcard-back.svg");
}

main();
