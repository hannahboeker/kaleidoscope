//Naming convention: globale Constanten in Versalien
export const BREAKPOINT = 1024;
export const RATIO_LANDSCAPE = 148 / 105;
export const RATIO_PORTRAIT = 105 / 148;
export const SYMMETRY = 3;
export const BG_COLOR = "#ffffff";
export const STROKE_COLOR = "#0800ff";
export const STROKE_WEIGHT = 3;
export const HEADER_HEIGHT = 52;
export const FOOTER_HEIGHT = 190;
export const FOOTER_HEIGHT_MOBILE = 110;

// Größe Postkarte
export function getSize() {
  const portrait = window.innerWidth <= BREAKPOINT;
  const ratio = portrait ? RATIO_LANDSCAPE : RATIO_PORTRAIT;
  const sidePad = Math.round(window.innerWidth * 0.03);
  const availableW = window.innerWidth - sidePad * 2;
  const footerH = window.innerWidth <= 430 ? FOOTER_HEIGHT_MOBILE : FOOTER_HEIGHT;
  const availableH = window.innerHeight - HEADER_HEIGHT - footerH;

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

  return { width: Math.floor(width), height: Math.floor(height) };
}

// Baut aus gespeicherten Strokes SVG-String
// M = move to (Startpunkt), L = line to (Linie zum nächsten Punkt)
export function buildSVG(strokes, canvasW, canvasH, bgColor = BG_COLOR) {
  const scale = Math.max(canvasW, canvasH) / 2;
  const centerX = canvasW / 2;
  const centerY = canvasH / 2;
  const angleStep = (2 * Math.PI) / SYMMETRY;

  const glowPasses = (size) => [
    { weight: size * 6, opacity: 0.12 },
    { weight: size * 3.33, opacity: 0.24 },
    { weight: size * 1.33, opacity: 0.71 },
  ];

  const paths = strokes
    .map((stroke) => {
      const { points, color, type } = stroke;
      const isAirbrush = type === "airbrush";

      if (points.length < 2) return "";

      const strokeSize = stroke.size ?? STROKE_WEIGHT;
      const passes = glowPasses(strokeSize);

      let result = "";
      for (let symmetryIndex = 0; symmetryIndex < SYMMETRY; symmetryIndex++) {
        const angle = angleStep * symmetryIndex;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const buildPath = (mirror) =>
          points
            .map((point, i) => {
              const px = mirror ? point.x : point.x;
              const py = mirror ? -point.y : point.y;
              const rotatedX = px * cos - py * sin;
              const rotatedY = px * sin + py * cos;
              return `${i === 0 ? "M" : "L"} ${(centerX + rotatedX * scale).toFixed(2)} ${(centerY + rotatedY * scale).toFixed(2)}`;
            })
            .join(" ");

        const dOriginal = buildPath(false);
        const dMirrored = buildPath(true);

        if (isAirbrush) {
          // Einzelne Segmente: bei langsamer Bewegung akkumulieren viele kurze Segmente
          // dicker Blob an Pause-Stellen, genau wie auf  Canvas
          result += `<g filter="url(#airbrush-glow)">\n`;
          for (let si = 1; si < points.length; si++) {
            const p0 = points[si - 1];
            const p1 = points[si];
            for (let mirror = 0; mirror <= 1; mirror++) {
              const py0 = mirror ? -p0.y : p0.y;
              const py1 = mirror ? -p1.y : p1.y;
              const d = `M ${(centerX + (p0.x * cos - py0 * sin) * scale).toFixed(2)} ${(centerY + (p0.x * sin + py0 * cos) * scale).toFixed(2)} L ${(centerX + (p1.x * cos - py1 * sin) * scale).toFixed(2)} ${(centerY + (p1.x * sin + py1 * cos) * scale).toFixed(2)}`;
              for (const { weight, opacity } of passes) {
                result += `<path d="${d}" stroke="${color}" stroke-width="${weight}" opacity="${opacity}" fill="none" stroke-linecap="round"/>\n`;
              }
            }
          }
          result += `</g>\n`;
        } else {
          result += `<path d="${dOriginal}" stroke="${color}" stroke-width="${strokeSize}" fill="none" stroke-linecap="round"/>\n`;
          result += `<path d="${dMirrored}" stroke="${color}" stroke-width="${strokeSize}" fill="none" stroke-linecap="round"/>\n`;
        }
      }
      return result;
    })
    .join("\n");

  const defs = `<defs><filter id="airbrush-glow"><feGaussianBlur stdDeviation="1"/></filter></defs>\n`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}">
${defs}<rect width="100%" height="100%" fill="${bgColor}"/>
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
export function drawStrokeSymmetric(sketch, stroke) {
  const { points, color, type } = stroke;
  const isAirbrush = type === "airbrush";

  if (points.length < 2) return;
  const angleStep = 360 / SYMMETRY;
  const scale = Math.max(sketch.width, sketch.height) / 2;

  // Hilfsfunktion: zeichnet ein Segment mit allen Symmetriekopien
  const drawSegment = (prev, curr) => {
    for (let symmetryIndex = 0; symmetryIndex < SYMMETRY; symmetryIndex++) {
      sketch.push();
      sketch.rotate(angleStep * symmetryIndex);
      sketch.line(
        prev.x * scale,
        prev.y * scale,
        curr.x * scale,
        curr.y * scale,
      );
      sketch.scale(1, -1);
      sketch.line(
        prev.x * scale,
        prev.y * scale,
        curr.x * scale,
        curr.y * scale,
      );
      sketch.pop();
    }
  };
  // dreimal übereinander malen für Airbrush effekt
  if (isAirbrush) {
    const col = sketch.color(color);
    const r = sketch.red(col);
    const g = sketch.green(col);
    const b = sketch.blue(col);
    // 3 Durchgänge: breit+transparent → schmal+deckend = Glow-Effekt
    const passes = [
      { weight: 18, alpha: 30 },
      { weight: 10, alpha: 60 },
      { weight: 4, alpha: 180 },
    ];
    for (const { weight, alpha } of passes) {
      sketch.strokeWeight(weight);
      sketch.stroke(r, g, b, alpha);
      for (let i = 1; i < points.length; i++) {
        drawSegment(points[i - 1], points[i]);
      }
    }
  } else {
    sketch.stroke(color);
    sketch.strokeWeight(STROKE_WEIGHT);
    for (let i = 1; i < points.length; i++) {
      drawSegment(points[i - 1], points[i]);
    }
  }
}
