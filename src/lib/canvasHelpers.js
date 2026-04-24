//Naming convention: globale Constanten in Versalien
export const BREAKPOINT = 1024;
export const RATIO_LANDSCAPE = 148 / 105;
export const RATIO_PORTRAIT = 105 / 148;
export const SYMMETRY = 3;
export const BG_COLOR = 15;
export const STROKE_COLOR = 255;
export const STROKE_WEIGHT = 3;

// Größe Postkarte
export function getSize() {
  const portrait = window.innerWidth <= BREAKPOINT; //Vergleichsoperator, portrait true, wenn Bildschirm schmal / false wenn breiter
  const ratio = portrait ? RATIO_LANDSCAPE : RATIO_PORTRAIT; // Wenn Portrait true dann RATIO_PORTRAIT
  const padding = 64; // 32px pro Seite
  const controlsHeight = 48;

  //Wie viel Space dann in total
  const availableW = window.innerWidth - padding;
  const availableH = window.innerHeight - padding - controlsHeight;

  // Berechne Größe die in beide Dimensionen passt
  let w = availableW;
  let h = portrait ? w * ratio : w / RATIO_LANDSCAPE;

  if (portrait) {
    h = w * ratio; // größe berechnen, wenn größer als available space, dann = available space
    if (h > availableH) {
      h = availableH;
      w = h / ratio;
    }
  } else {
    h = w * RATIO_PORTRAIT; // querformat
    if (h > availableH) {
      h = availableH;
      w = h / RATIO_PORTRAIT;
    }
    // max breite auf desktop
    const maxW = 800;
    if (w > maxW) {
      w = maxW;
      h = w * RATIO_PORTRAIT;
    }
  }

  return { w: Math.floor(w), h: Math.floor(h) };
}

// Baut aus gespeicherten Strokes SVG-String
//So wird aus Daten ein Bild das angezeigt werden kann
// M = move to (Startpunkt), L = line to (Linie zum nächsten Punkt)
export function buildSVG(strokes, canvasW, canvasH) {
  const scale = Math.max(canvasW, canvasH) / 2; // gleiche scale wie beim Zeichnen
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const angleStep = (2 * Math.PI) / SYMMETRY;

  const paths = strokes
    .map((points) => {
      if (points.length < 2) return "";

      // Alle Symmetrie-Kopien als SVG paths
      let result = "";
      for (let s = 0; s < SYMMETRY; s++) {
        const angle = angleStep * s;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Original rotiert
        const d1 = points
          .map((pt, i) => {
            const rx = pt.x * cos - pt.y * sin;
            const ry = pt.x * sin + pt.y * cos;
            return `${i === 0 ? "M" : "L"} ${(cx + rx * scale).toFixed(2)} ${(cy + ry * scale).toFixed(2)}`;
          })
          .join(" ");
        result += `<path d="${d1}" stroke="white" stroke-width="${STROKE_WEIGHT}" fill="none" stroke-linecap="round"/>\n`;

        // Y gespiegelt, dann rotiert
        const d2 = points
          .map((pt, i) => {
            const rx = pt.x * cos - -pt.y * sin;
            const ry = pt.x * sin + -pt.y * cos;
            return `${i === 0 ? "M" : "L"} ${(cx + rx * scale).toFixed(2)} ${(cy + ry * scale).toFixed(2)}`;
          })
          .join(" ");
        result += `<path d="${d2}" stroke="white" stroke-width="${STROKE_WEIGHT}" fill="none" stroke-linecap="round"/>\n`;
      }
      return result;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}" style="background:#0f0f0f">
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

// Ausgelagerte Funktion die einen einzelnen Strich mit allen Symmetrie-Kopien zeichnet.
// Wird sowohl beim Live-Zeichnen als auch beim Redraw (Undo/Resize) verwendet,
// damit alles immer konsistent aussieht
export function drawStrokeSymmetric(p, points) {
  if (points.length < 2) return;
  const angleStep = 360 / SYMMETRY;

  const scale = Math.max(p.width, p.height) / 2; // Verhältnisse anstatt pixel speichern damit skalierung der zeichnungen funktioniert

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    for (let s = 0; s < SYMMETRY; s++) {
      p.push(); // Transformations-Zustand speichern
      p.rotate(angleStep * s); // Um 120° (bzw. 240°) rotieren

      // Original-Linie
      p.stroke(STROKE_COLOR);
      p.strokeWeight(STROKE_WEIGHT);
      p.line(
        prev.x * scale, //verhältnisse wieder in pixel umwandeln
        prev.y * scale,
        curr.x * scale,
        curr.y * scale,
      );

      // Gespiegelte Linie (Y-Achse umkehren)
      p.scale(1, -1);
      p.line(prev.x * scale, prev.y * scale, curr.x * scale, curr.y * scale);

      p.pop(); // Transformations-Zustand wiederherstellen
    }
  }
}
