//Naming convention: globale Constanten in Versalien
export const BREAKPOINT = 1024;
export const RATIO_LANDSCAPE = 148 / 105;
export const RATIO_PORTRAIT = 105 / 148;
export const SYMMETRY = 3;
export const BG_COLOR = "#1e0035";
export const STROKE_COLOR = "#00ff66";
export const STROKE_WEIGHT = 3;

// Größe Postkarte
export function getSize() {
  const portrait = window.innerWidth <= BREAKPOINT;
  const ratio = portrait ? RATIO_LANDSCAPE : RATIO_PORTRAIT;
  const padding = 64; // 32px pro Seite
  const controlsHeight = 48;

  const availableW = window.innerWidth - padding;
  const availableH = window.innerHeight - padding - controlsHeight;

  let width = availableW;
  let height;

  if (portrait) {
    height = width * ratio;
    if (height > availableH) {
      height = availableH;
      width = height / ratio;
    }
  } else {
    height = width * RATIO_PORTRAIT;
    if (height > availableH) {
      height = availableH;
      width = height / RATIO_PORTRAIT;
    }
    const maxW = 800;
    if (width > maxW) {
      width = maxW;
      height = width * RATIO_PORTRAIT;
    }
  }

  return { w: Math.floor(width), h: Math.floor(height) };
}

// Baut aus gespeicherten Strokes SVG-String
// M = move to (Startpunkt), L = line to (Linie zum nächsten Punkt)
export function buildSVG(strokes, canvasW, canvasH) {
  const scale = Math.max(canvasW, canvasH) / 2;
  const centerX = canvasW / 2;
  const centerY = canvasH / 2;
  const angleStep = (2 * Math.PI) / SYMMETRY;

  const paths = strokes
    .map((points) => {
      if (points.length < 2) return "";

      let result = "";
      for (let symmetryIndex = 0; symmetryIndex < SYMMETRY; symmetryIndex++) {
        const angle = angleStep * symmetryIndex;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Original rotiert
        const pathOriginal = points
          .map((point, i) => {
            const rotatedX = point.x * cos - point.y * sin;
            const rotatedY = point.x * sin + point.y * cos;
            return `${i === 0 ? "M" : "L"} ${(centerX + rotatedX * scale).toFixed(2)} ${(centerY + rotatedY * scale).toFixed(2)}`;
          })
          .join(" ");
        result += `<path d="${pathOriginal}" stroke="${STROKE_COLOR}" stroke-width="${STROKE_WEIGHT}" fill="none" stroke-linecap="round"/>\n`;

        // Y gespiegelt, dann rotiert
        const pathMirrored = points
          .map((point, i) => {
            const rotatedX = point.x * cos - -point.y * sin;
            const rotatedY = point.x * sin + -point.y * cos;
            return `${i === 0 ? "M" : "L"} ${(centerX + rotatedX * scale).toFixed(2)} ${(centerY + rotatedY * scale).toFixed(2)}`;
          })
          .join(" ");
        result += `<path d="${pathMirrored}" stroke="${STROKE_COLOR}" stroke-width="${STROKE_WEIGHT}" fill="none" stroke-linecap="round"/>\n`;
      }
      return result;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}" style="background:${BG_COLOR}">
${paths}
</svg>`;
}

export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// userId aus localStorage, beim ersten Besuch neu generieren und speichern
export function getUserId() {
  let userId = localStorage.getItem("kaleidoscope_userId");
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem("kaleidoscope_userId", userId);
  }
  return userId;
}

// Zeichnet einen einzelnen Strich mit allen Symmetrie-Kopien.
// Wird beim Live-Zeichnen und beim Redraw (Undo/Resize) verwendet.
export function drawStrokeSymmetric(sketch, points) {
  if (points.length < 2) return;
  const angleStep = 360 / SYMMETRY;
  const scale = Math.max(sketch.width, sketch.height) / 2;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    for (let symmetryIndex = 0; symmetryIndex < SYMMETRY; symmetryIndex++) {
      sketch.push();
      sketch.rotate(angleStep * symmetryIndex);

      sketch.stroke(STROKE_COLOR);
      sketch.strokeWeight(STROKE_WEIGHT);
      sketch.line(
        prev.x * scale,
        prev.y * scale,
        curr.x * scale,
        curr.y * scale,
      );

      // Gespiegelte Linie (Y-Achse umkehren)
      sketch.scale(1, -1);
      sketch.line(
        prev.x * scale,
        prev.y * scale,
        curr.x * scale,
        curr.y * scale,
      );

      sketch.pop();
    }
  }
}
