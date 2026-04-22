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

// Größe Postkarte
function getSize() {
  const portrait = window.innerWidth <= BREAKPOINT; //Vergleichsoperator, portrait true, wenn  Bildschirm schmal / false wenn breiter
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
export default function Canvas() {
  const containerRef = useRef(null); // DOM-Element wo p5 den Canvas reinzeichnet
  const p5Ref = useRef(null); // p5-Instanz für handleUndo
  const strokesRef = useRef([]); // Linien | Ref weil p5 drauf zugreift
  const [strokeCount, setStrokeCount] = useState(0); // nur für undo-Button

  //useCallback damit durch useEffect später nicht bei jedem render neu erstellen
  // Für undo und resize
  const redrawStrokes = useCallback((p) => {
    p.background(15);
    strokesRef.current.forEach((stroke) => {
      p.stroke(255);
      p.strokeWeight(3);
      stroke.forEach((pt, i) => {
        if (i === 0) return;
        p.line(stroke[i - 1].x, stroke[i - 1].y, pt.x, pt.y);
      });
    });
  }, []);

  useEffect(() => {
    if (p5Ref.current) return;

    const sketch = (p) => {
      let currentStroke = [];
      let isDrawing = false;

      //noLoop() stoppt 60fps-Loop von p5
      p.setup = () => {
        const { w, h } = getSize();
        const cnv = p.createCanvas(w, h);
        cnv.style("display", "block");
        p.background(15);
        p.strokeCap(p.ROUND);
        p.noLoop();
      };

      // hier getSize aufgerufen, liest window größe aktuell aus
      p.windowResized = () => {
        const { w, h } = getSize();
        p.resizeCanvas(w, h);
        redrawStrokes(p); // Funktion aufrufen, alles neu zeichnen
      };

      p.mousePressed = () => {
        isDrawing = true;
        currentStroke = [{ x: p.mouseX, y: p.mouseY }]; //Start
      };

      p.mouseDragged = () => {
        if (!isDrawing) return;
        const prev = currentStroke[currentStroke.length - 1]; //Letzter Punkt
        const point = { x: p.mouseX, y: p.mouseY };
        currentStroke.push(point);
        p.stroke(255);
        p.strokeWeight(3);
        p.line(prev.x, prev.y, point.x, point.y); //Linie Punkt zu Punkt
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

  return (
    <Wrapper>
      <CanvasWrapper>
        <div ref={containerRef} />
        <Controls>
          {/* wenn keine strokes gezählt, button disabled */}
          <UndoButton onClick={handleUndo} disabled={strokeCount === 0}>
            undo
          </UndoButton>
        </Controls>
      </CanvasWrapper>
    </Wrapper>
  );
}
