import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";

// A6 landscape
const A6_W_PX = 1748;
const A6_H_PX = 1240;
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

    // S.2 Rückseiten-SVG laden, Platzhalterfarben ersetzen
    const backSvgPath = path.join(process.cwd(), "public", "postcard-back.svg");
    let backSvg = await readFile(backSvgPath, "utf-8");
    backSvg = backSvg.replaceAll(SVG_COLOR_PRIMARY, strokeColor);
    backSvg = backSvg.replaceAll(SVG_COLOR_SECONDARY, bgColor);
    // viewBox auf den tatsächlichen Inhalt zuschneiden (SVG-Canvas hat sonst große Ränder)
    backSvg = backSvg.replace(
      /viewBox="[^"]*"/,
      'viewBox="103.37 64.98 1748.47 1240.47"',
    );

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
