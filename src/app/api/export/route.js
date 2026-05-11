import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";

// Font einmalig laden und als base64 cachen
let fontBase64Cache = null;
async function getFontBase64() {
  if (!fontBase64Cache) {
    const fontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "neumarkt-regular-v01.woff",
    );
    const buf = await readFile(fontPath);
    fontBase64Cache = buf.toString("base64");
  }
  return fontBase64Cache;
}

function injectFont(svg, base64) {
  const dataUri = `data:font/woff;base64,${base64}`;
  // beide Namen eintragen, da Illustrator-Export beide nutzt
  const fontFace = `@font-face{font-family:'neumarkt-regular-v01';src:url('${dataUri}') format('woff');}@font-face{font-family:'neumarktregularv01-Round900';src:url('${dataUri}') format('woff');}`;
  return svg.replace(/(<style[^>]*>)/, `$1${fontFace}`);
}

export const maxDuration = 30;

// A6 landscape at 150 DPI
const A6_W_PX = 874;
const A6_H_PX = 620;
const A6_W_PT = 419.53;
const A6_H_PT = 297.64;

// Placeholder colors postcard-back.svg
const SVG_COLOR_PRIMARY = "#e6007e";
const SVG_COLOR_SECONDARY = "#009fe3";

export async function POST(request) {
  try {
    const { svg, bgColor, strokeColor } = await request.json();

    // S. 1 Design SVG zu PNG
    // .flatten() ersetzt Transparenz durch bgColor
    const frontPng = await sharp(Buffer.from(svg))
      .resize(A6_W_PX, A6_H_PX, { fit: "cover" })
      .flatten({ background: bgColor })
      .png()
      .toBuffer();

    const pdfDoc = await PDFDocument.create();

    const frontImage = await pdfDoc.embedPng(frontPng);
    const frontPage = pdfDoc.addPage([A6_W_PT, A6_H_PT]);
    frontPage.drawImage(frontImage, {
      x: 0,
      y: 0,
      width: A6_W_PT,
      height: A6_H_PT,
    });

    // S.2 Rückseiten-SVG laden, Platzhalterfarben ersetzen, Font einbetten
    const backSvgPath = path.join(process.cwd(), "public", "postcard-back.svg");
    let backSvg = await readFile(backSvgPath, "utf-8");
    const backPrimary = strokeColor === "#ffffff" ? bgColor : strokeColor;
    const backSecondary = bgColor === "#ffffff" ? strokeColor : bgColor;
    backSvg = backSvg.replaceAll(SVG_COLOR_PRIMARY, backPrimary);
    backSvg = backSvg.replaceAll(SVG_COLOR_SECONDARY, backSecondary);
    backSvg = injectFont(backSvg, await getFontBase64());

    //Buffer sind binäre Daten
    const backPng = await sharp(Buffer.from(backSvg))
      .resize(A6_W_PX, A6_H_PX, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();

    const backImage = await pdfDoc.embedPng(backPng);
    const backPage = pdfDoc.addPage([A6_W_PT, A6_H_PT]);
    backPage.drawImage(backImage, {
      x: 0,
      y: 0,
      width: A6_W_PT,
      height: A6_H_PT,
    });

    const pdfBytes = await pdfDoc.save();
    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="kaleidoscope-postcard.pdf"',
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
