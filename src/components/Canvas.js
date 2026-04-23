"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import p5 from "p5";
import styled from "styled-components";

const Wrapper = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 32px;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  width: 100%;
`;

// Basis-Button Styling — wird von UndoButton und SaveButton geteilt
const Button = styled.button`
  padding: 8px 20px;
  background: transparent;
  border: 3px solid #15ff00;
  color: #15ff00;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition:
    border-color 0.2s,
    color 0.2s;
  &:hover {
    border-color: rgb(234, 255, 0);
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const UndoButton = styled(Button)``;

// SaveButton färbt sich grün wenn gespeichert
// $ Präfix verhindert dass $saved ans DOM weitergegeben wird
const SaveButton = styled(Button)`
  border-color: ${({ $saved }) => ($saved ? "#0040ff" : "#ff4d00")};
  color: ${({ $saved }) => ($saved ? "#0040ff" : "#ff4d00")};
`;

const CanvasWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

//___________________________________________________________________________________________________________
//Naming convention: globale Constanten in Versalien
const BREAKPOINT = 1024;
const RATIO_LANDSCAPE = 148 / 105;
const RATIO_PORTRAIT = 105 / 148;
const SYMMETRY = 3;
const BG_COLOR = 15;
const STROKE_COLOR = 255;
const STROKE_WEIGHT = 3;

// Größe Postkarte
function getSize() {
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

//___________________________________________________________________________________________________________
// Ausgelagerte Funktion die einen einzelnen Strich mit allen Symmetrie-Kopien zeichnet.
// Wird sowohl beim Live-Zeichnen als auch beim Redraw (Undo/Resize) verwendet,
// damit alles immer konsistent aussieht
function drawStrokeSymmetric(p, points) {
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

//___________________________________________________________________________________________________________
// Baut aus gespeicherten Strokes SVG-String
//So wird aus Daten ein Bild das angezeigt werden kann
// M = move to (Startpunkt), L = line to (Linie zum nächsten Punkt)
function buildSVG(strokes, canvasW, canvasH) {
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

// Generiert  UUID
function generateUUID() {
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
function getUserId() {
  let userId = localStorage.getItem("kaleidoscope_userId");
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem("kaleidoscope_userId", userId);
  }
  return userId;
}

//___________________________________________________________________________________________________________
export default function Canvas() {
  const containerRef = useRef(null); // DOM-Element wo p5 den Canvas reinzeichnet
  const p5Ref = useRef(null); // p5-Instanz für handleUndo
  const strokesRef = useRef([]); // Linien | Ref weil p5 drauf zugreift
  const [strokeCount, setStrokeCount] = useState(0); // nur für undo-Button
  // "idle" | "saving" | "saved" | "error" — steuert Save-Button Text und Farbe
  const [saveState, setSaveState] = useState("idle");

  const redrawStrokes = useCallback((p) => {
    p.background(BG_COLOR);
    p.push();
    p.translate(p.width / 2, p.height / 2); // Ursprung = Canvas-Mitte
    p.angleMode(p.DEGREES);
    strokesRef.current.forEach((stroke) => drawStrokeSymmetric(p, stroke));
    p.pop();
  }, []);

  useEffect(() => {
    if (p5Ref.current) return;

    const sketch = (p) => {
      let currentStroke = [];
      let isDrawing = false;

      p.setup = () => {
        const { w, h } = getSize();
        const cnv = p.createCanvas(w, h);
        cnv.style("display", "block");
        p.background(BG_COLOR);
        p.strokeCap(p.ROUND);
        p.angleMode(p.DEGREES);
        p.noLoop();
      };

      p.windowResized = () => {
        const { w, h } = getSize();
        p.resizeCanvas(w, h);
        redrawStrokes(p);
      };

      p.mousePressed = () => {
        if (
          p.mouseX < 0 ||
          p.mouseX > p.width ||
          p.mouseY < 0 ||
          p.mouseY > p.height
        )
          return;
        isDrawing = true;

        const scale = Math.max(p.width, p.height) / 2;

        currentStroke = [
          {
            x: (p.mouseX - p.width / 2) / scale,
            y: (p.mouseY - p.height / 2) / scale,
          },
        ];
      };

      p.mouseDragged = () => {
        if (!isDrawing) return;
        if (
          p.mouseX < 0 ||
          p.mouseX > p.width ||
          p.mouseY < 0 ||
          p.mouseY > p.height
        )
          return;

        const scale = Math.max(p.width, p.height) / 2;

        const prev = currentStroke[currentStroke.length - 1];
        const point = {
          x: (p.mouseX - p.width / 2) / scale,
          y: (p.mouseY - p.height / 2) / scale,
        };
        currentStroke.push(point);

        p.push();
        p.translate(p.width / 2, p.height / 2);
        const angleStep = 360 / SYMMETRY;
        for (let s = 0; s < SYMMETRY; s++) {
          p.push();
          p.rotate(angleStep * s);
          p.stroke(STROKE_COLOR);
          p.strokeWeight(STROKE_WEIGHT);
          p.line(
            prev.x * scale,
            prev.y * scale,
            point.x * scale,
            point.y * scale,
          );
          p.scale(1, -1);
          p.line(
            prev.x * scale,
            prev.y * scale,
            point.x * scale,
            point.y * scale,
          );
          p.pop();
        }
        p.pop();
      };

      //wenn nicht zeichnet (weniger als zwei Punkte die Linie ergeben könnten)
      p.mouseReleased = () => {
        if (!isDrawing || currentStroke.length < 2) {
          isDrawing = false;
          currentStroke = [];
          return;
        }
        isDrawing = false;
        strokesRef.current.push([...currentStroke]);
        setStrokeCount(strokesRef.current.length);
        currentStroke = [];
      };

      p.touchMoved = () => false;
    };

    const instance = new p5(sketch, containerRef.current);
    p5Ref.current = instance;

    return () => {
      instance.remove();
      p5Ref.current = null;
    };
  }, [redrawStrokes]);

  //Canvas schwarz übermalen, alle Linien neu
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    const p = p5Ref.current;
    if (!p) return;
    redrawStrokes(p);
  };

  //__________________________________________________________________________;
  // SVG aus Strokes bauen / mit userId an API schicken / Feedback anzeigen
  const handleSave = async () => {
    if (strokesRef.current.length === 0) return;
    setSaveState("saving");

    try {
      const p = p5Ref.current;
      const userId = getUserId(); // UUID aus localStorage oder neu generieren
      const svg = buildSVG(strokesRef.current, p.width, p.height);

      const response = await fetch("/api/design/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          svg,
          strokes: strokesRef.current,
          symmetry: SYMMETRY,
        }),
      });

      if (!response.ok) throw new Error("Speichern fehlgeschlagen");

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000); // Nach 2s zurück zu idle (Leerraum, nichtsmachen)
    } catch (err) {
      console.error(err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  return (
    <Wrapper>
      <CanvasWrapper>
        <div ref={containerRef} />
        <Controls>
          <SaveButton
            onClick={handleSave}
            disabled={saveState === "saving" || strokeCount === 0}
            $saved={saveState === "saved"}
          >
            {/* Buttontext je state*/}
            {saveState === "saving" && "saving..."}
            {saveState === "saved" && "saved ✓"}
            {saveState === "error" && "error — retry"}
            {saveState === "idle" && "save"}
          </SaveButton>
          {/* wenn keine strokes gezählt, button disabled */}
          <UndoButton onClick={handleUndo} disabled={strokeCount === 0}>
            undo
          </UndoButton>
        </Controls>
      </CanvasWrapper>
    </Wrapper>
  );
}
