"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import p5 from "p5";
import styled from "styled-components";
import Link from "next/link";
import {
  BREAKPOINT,
  RATIO_LANDSCAPE,
  RATIO_PORTRAIT,
  SYMMETRY,
  BG_COLOR,
  STROKE_COLOR,
  STROKE_WEIGHT,
  getSize,
  buildSVG,
  drawStrokeSymmetric,
  generateUUID,
  getUserId,
} from "@/lib/canvasHelpers";

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

// Basis-Button Styling, wird von UndoButton und SaveButton geteilt
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
export default function Canvas() {
  const containerRef = useRef(null); // DOM-Element wo p5 den Canvas reinzeichnet
  const p5Ref = useRef(null); // p5-Instanz für handleUndo
  const strokesRef = useRef([]); // Linien | Ref weil p5 drauf zugreift
  const [strokeCount, setStrokeCount] = useState(0); // nur für undo-Button
  const [saveState, setSaveState] = useState("idle");
  //useSearchParams statt window.location.search weil raktiv, auch bei Client-Side-Navigation.
  // Sonst wenn editbutton klickt schwarzer canvas und erst bei reload sichtbar
  const searchParams = useSearchParams();
  const designId = searchParams.get("id");

  const redrawStrokes = useCallback((p) => {
    p.background(BG_COLOR);
    p.push();
    p.translate(p.width / 2, p.height / 2); // Ursprung = Canvas-Mitte
    p.angleMode(p.DEGREES);
    strokesRef.current.forEach((stroke) => drawStrokeSymmetric(p, stroke));
    p.pop();
  }, []);

  // EDIT BUTTON FETCH / Fetch läuft async — p5 fertig wenn Callback aufgerufen
  useEffect(() => {
    if (!designId) return;

    // wenn designID gesetzt, Strokes geladen und in strokesRef.current,
    const userId = getUserId();
    fetch(`/api/design/${designId}?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        strokesRef.current = data.design?.strokes ?? [];
        setStrokeCount(strokesRef.current.length);
        // requestAnimationFrame damit erst p5 eigenener Start-zyklus abgeschlossen ist und dann redrawt wird
        // sonst könnte p5 Canvas danach löschen durch initial setup
        requestAnimationFrame(() => {
          if (p5Ref.current && strokesRef.current.length > 0) {
            redrawStrokes(p5Ref.current);
          }
        });
      })
      .catch((err) => console.error("loading design failed:", err));
  }, [designId, redrawStrokes]);

  // Canvas setup
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
        //Saftey Fallback falls strokes schon vor setup geladen
        if (strokesRef.current.length > 0) redrawStrokes(p);
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

  const handleExport = async () => {
    try {
      const canvas = p5Ref.current;
      const svg = buildSVG(strokesRef.current, canvas.width, canvas.height);

      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          svg,
          bgColor: BG_COLOR,
          strokeColor: STROKE_COLOR,
        }),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "kaleidoscope-postcard.pdf";
      downloadLink.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

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

      const response = designId
        ? await fetch(`/api/design/${designId}?userId=${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ svg, strokes: strokesRef.current }),
          })
        : await fetch("/api/design/save", {
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
          <Button as={Link} href="/gallery">
            gallery
          </Button>
          <Button onClick={handleExport} disabled={strokeCount === 0}>
            export pdf
          </Button>
          <UndoButton onClick={handleUndo} disabled={strokeCount === 0}>
            undo
          </UndoButton>
        </Controls>
      </CanvasWrapper>
    </Wrapper>
  );
}
