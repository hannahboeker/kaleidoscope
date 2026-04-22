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
  justify-content: flex-end;
  margin-top: 12px;
  width: 100%;
`;

const UndoButton = styled.button`
  padding: 8px 20px;
  background: transparent;
  border: 1px solid #444;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.2s;
  &:hover {
    border-color: #888;
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
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
// damit alles immer konsistent aussieht.
function drawStrokeSymmetric(p, points) {
  if (points.length < 2) return;
  const angleStep = 360 / SYMMETRY;

  const scale = Math.max(p.width, p.height) / 2; // Verhältnisse anstatt pixel soeichern damit skalierung der zeichnungen funktioniert

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
export default function Canvas() {
  const containerRef = useRef(null); // DOM-Element wo p5 den Canvas reinzeichnet
  const p5Ref = useRef(null); // p5-Instanz für handleUndo
  const strokesRef = useRef([]); // Linien | Ref weil p5 drauf zugreift
  const [strokeCount, setStrokeCount] = useState(0); // nur für undo-Button

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

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    const p = p5Ref.current;
    if (!p) return;
    redrawStrokes(p);
  };

  return (
    <Wrapper>
      <CanvasWrapper>
        <div ref={containerRef} />
        <Controls>
          <UndoButton onClick={handleUndo} disabled={strokeCount === 0}>
            undo
          </UndoButton>
        </Controls>
      </CanvasWrapper>
    </Wrapper>
  );
}
