import { useEffect } from "react";
import p5 from "p5";
import {
  SYMMETRY,
  STROKE_WEIGHT,
  getSize,
  drawStrokeSymmetric,
} from "@/lib/canvasHelpers";

export function useP5Sketch({
  workspaceAreaRef,
  containerRef,
  strokesRef,
  strokeColorRef,
  bgColorRef,
  brushTypeRef,
  brushSizeRef,
  redrawStrokes,
  setCanvasSize,
  setShowArrows,
  p5Ref,
}) {
  useEffect(() => {
    if (p5Ref.current) return;

    // native Touch-Handler, außerhalb von p5, damit iOS Safari rechtzeitig über Scrollen/Zeichnen entscheidet
    let touchStartX = 0;
    let touchStartY = 0;
    let drawingLocked = false; // true sobald Zeichnen erkannt
    let canvasElRef = null;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        drawingLocked = false;
        setShowArrows(false);
      }
    };

    const onTouchEnd = () => {
      drawingLocked = false;
      setShowArrows(true);
    };

    const onTouchMove = (e) => {
      if (drawingLocked) {
        e.preventDefault();
        return;
      }
      const veränderungX = Math.abs(e.touches[0].clientX - touchStartX);
      const veränderungY = Math.abs(e.touches[0].clientY - touchStartY);
      if (veränderungX < 8 && veränderungY < 8) return; // noch zu wenig Bewegung
      if (veränderungX > veränderungY) return; // mehr horizontal als vertikal: scrollen
      drawingLocked = true;
      e.preventDefault();
    };

    const sketchDefinition = (sketch) => {
      let currentStroke = [];
      let isDrawing = false;

      sketch.setup = () => {
        const { width, height } = getSize();
        const canvasElement = sketch.createCanvas(width, height);
        canvasElement.style("display", "block");
        sketch.background(bgColorRef.current);
        sketch.strokeCap(sketch.ROUND);
        sketch.angleMode(sketch.DEGREES);
        sketch.noLoop();
        setCanvasSize({ width, height });
        if (strokesRef.current.length > 0) redrawStrokes(sketch);
        canvasElRef = canvasElement.elt;
        canvasElRef.addEventListener("touchstart", onTouchStart, {
          passive: true,
        });
        canvasElRef.addEventListener("touchmove", onTouchMove, {
          passive: false,
        });
        canvasElRef.addEventListener("touchend", onTouchEnd, { passive: true });
      };

      sketch.windowResized = () => {
        const { width, height } = getSize();
        sketch.resizeCanvas(width, height);
        setCanvasSize({ width, height });
        redrawStrokes(sketch);
      };

      sketch.mousePressed = () => {
        if (
          sketch.mouseX < 0 ||
          sketch.mouseX > sketch.width ||
          sketch.mouseY < 0 ||
          sketch.mouseY > sketch.height
        )
          return;
        isDrawing = true;
        setShowArrows(false);
        const scale = Math.max(sketch.width, sketch.height) / 2;
        currentStroke = [
          {
            x: (sketch.mouseX - sketch.width / 2) / scale,
            y: (sketch.mouseY - sketch.height / 2) / scale,
          },
        ];
      };

      sketch.mouseDragged = () => {
        if (!isDrawing) return;
        if (
          sketch.mouseX < 0 ||
          sketch.mouseX > sketch.width ||
          sketch.mouseY < 0 ||
          sketch.mouseY > sketch.height
        )
          return;
        const scale = Math.max(sketch.width, sketch.height) / 2;
        const prev = currentStroke[currentStroke.length - 1];
        const point = {
          x: (sketch.mouseX - sketch.width / 2) / scale,
          y: (sketch.mouseY - sketch.height / 2) / scale,
        };
        currentStroke.push(point);
        const isAirbrush = brushTypeRef.current === "airbrush";
        sketch.push();
        sketch.translate(sketch.width / 2, sketch.height / 2);
        const angleStep = 360 / SYMMETRY;

        if (isAirbrush) {
          const col = sketch.color(strokeColorRef.current);
          const r = sketch.red(col);
          const g = sketch.green(col);
          const b = sketch.blue(col);
          const s = brushSizeRef.current;
          //skalieren wegen brushsize
          const passes = [
            { weight: s * 6, alpha: 30 },
            { weight: s * 3.33, alpha: 60 },
            { weight: s * 1.33, alpha: 180 },
          ];
          for (const { weight, alpha } of passes) {
            sketch.strokeWeight(weight);
            sketch.stroke(r, g, b, alpha);
            for (let i = 0; i < SYMMETRY; i++) {
              sketch.push();
              sketch.rotate(angleStep * i);
              sketch.line(
                prev.x * scale,
                prev.y * scale,
                point.x * scale,
                point.y * scale,
              );
              sketch.scale(1, -1);
              sketch.line(
                prev.x * scale,
                prev.y * scale,
                point.x * scale,
                point.y * scale,
              );
              sketch.pop();
            }
          }
        } else {
          for (let i = 0; i < SYMMETRY; i++) {
            sketch.push();
            sketch.rotate(angleStep * i);
            sketch.stroke(strokeColorRef.current);
            sketch.strokeWeight(brushSizeRef.current);
            sketch.line(
              prev.x * scale,
              prev.y * scale,
              point.x * scale,
              point.y * scale,
            );
            sketch.scale(1, -1);
            sketch.line(
              prev.x * scale,
              prev.y * scale,
              point.x * scale,
              point.y * scale,
            );
            sketch.pop();
          }
        }
        sketch.pop();
      };

      sketch.mouseReleased = () => {
        setShowArrows(true);
        if (!isDrawing || currentStroke.length < 2) {
          isDrawing = false;
          currentStroke = [];
          return;
        }
        isDrawing = false;
        strokesRef.current.push({
          points: [...currentStroke],
          color: strokeColorRef.current,
          type: brushTypeRef.current,
          size: brushSizeRef.current,
        });
        currentStroke = [];
      };

      // touchMoved mit leerer Funktion überschrieben, damit scrollen möglich
      sketch.touchMoved = () => {};
    };

    const canvasDiv = document.createElement("div");
    canvasDiv.style.display = "flex";
    canvasDiv.style.alignItems = "center";
    canvasDiv.style.justifyContent = "center";
    containerRef.current = canvasDiv;
    workspaceAreaRef.current.appendChild(canvasDiv);

    const instance = new p5(sketchDefinition, canvasDiv);
    p5Ref.current = instance;

    return () => {
      canvasElRef?.removeEventListener("touchstart", onTouchStart);
      canvasElRef?.removeEventListener("touchmove", onTouchMove);
      canvasElRef?.removeEventListener("touchend", onTouchEnd);
      instance.remove();
      canvasDiv.remove();
      p5Ref.current = null;
    };
  }, [redrawStrokes]);
}
