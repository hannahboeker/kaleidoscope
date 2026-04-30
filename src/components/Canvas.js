"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import p5 from "p5";
import styled from "styled-components";
import {
  SYMMETRY,
  BG_COLOR,
  STROKE_COLOR,
  STROKE_WEIGHT,
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  getSize,
  buildSVG,
  drawStrokeSymmetric,
  getUserId,
} from "@/lib/canvasHelpers";

const RAINBOW = [
  "#e63535",
  "#ff8c00",
  "#ffe100",
  "#00c853",
  "#00bcd4",
  "#1e88e5",
  "#e91e63",
  "#9c27b0",
];

const RAINBOW_EXPORT = [
  "#e63535",
  "#ff8c00",
  "#c4a000",
  "#00c853",
  "#00bcd4",
  "#1e88e5",
  "#e91e63",
  "#9c27b0",
];

const FONT_SIZE = "30px";
//.split um einzelne Buchstaben zu färben // Wenn index größer als array beginn von vorne
function RainbowText({ text, colors = RAINBOW }) {
  return (
    <>
      {text.split("").map((char, i) => (
        <span key={i} style={{ color: colors[i % colors.length] }}>
          {char === " " ? " " : char}
        </span>
      ))}
    </>
  );
}

//BackgroundSVG orientiert sich absolut hier dran, scrollen ausstellen
const PageWrapper = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #000;
  font-family: "Neumarkt", serif;
  position: relative;
`;

//hinter allem, weiße ovale und schnittmenge
const BackgroundSVG = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
`;

const Header = styled.header`
  height: ${HEADER_HEIGHT}px;
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
`;

const TitleOval = styled.div`
  position: fixed;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 68%;
  height: 130px;
  border: 1.5px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 30px;
  font-size: ${FONT_SIZE};
  z-index: 2;
`;

//Basis für Button
const SideOval = styled.button`
  position: fixed;
  width: 56px;
  height: 86px;
  border: 1.5px solid white;
  border-radius: 50%;
  background: transparent;
  color: white;
  cursor: pointer;
  font-family: "Neumarkt", serif;
  font-size: ${FONT_SIZE};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;

  &:disabled {
    cursor: default;
  }
`;

const UndoOval = styled(SideOval)`
  top: 25px;
  left: 3%;
  transform: rotate(-30deg);
`;

const SaveOval = styled(SideOval)`
  top: 30px;
  right: 30px;
  transform: rotate(150deg);
  ${({ $error }) => $error && `border-color: #e63535; color: #e63535;`}
`;

const SaveLabel = styled.span`
  display: inline-block;
  transform: rotate(-90deg) translateY(-10px);
`;

// Canvas in der Mitte, p5-Element verdeckt SVG dahinter
const CanvasSection = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  z-index: 1;
  padding-bottom: 30px;
`;

const Footer = styled.footer`
  height: ${FOOTER_HEIGHT}px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
`;

// position: fixed immer am SVG ausgerichtet, unabhängig von Canvas-Größe
const ExportButton = styled.button`
  position: fixed;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: "Neumarkt", serif;
  font-size: ${FONT_SIZE};
  z-index: 2;
  white-space: nowrap;

  &:disabled {
    cursor: default;
  }
`;

const GalleryButton = styled.button`
  position: fixed;
  bottom: 3%;
  left: 50%;
  transform: translateX(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  color: white;
  font-family: "Neumarkt", serif;
  font-size: ${FONT_SIZE};
  z-index: 2;
  white-space: nowrap;
  letter-spacing: 0.09em;
`;

// //expanding nicht an DOM, wenn true animatiionstartet
const GalleryOval = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 85vw;
  height: 14vh;
  border: 1.5px solid white;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;

  ${({ $expanding }) =>
    $expanding &&
    `
    transition: height 0.7s ease-in-out, width 0.7s ease-in-out;
    height: 100vh;
    width: 100vw;
  `}
`;

export default function Canvas() {
  const containerRef = useRef(null);
  const p5Ref = useRef(null);
  const strokesRef = useRef([]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [saveState, setSaveState] = useState("idle");
  const [expanding, setExpanding] = useState(false);
  const searchParams = useSearchParams();
  const designId = searchParams.get("id");
  const router = useRouter();

  //TODO:Timing noch verbessern? löst nach 700ms aus
  const handleGalleryNav = () => {
    setExpanding(true);
    setTimeout(() => router.push("/gallery"), 700);
  };

  const redrawStrokes = useCallback((sketch) => {
    sketch.background(BG_COLOR);
    sketch.push();
    sketch.translate(sketch.width / 2, sketch.height / 2);
    sketch.angleMode(sketch.DEGREES);
    strokesRef.current.forEach((stroke) => drawStrokeSymmetric(sketch, stroke));
    sketch.pop();
  }, []);

  useEffect(() => {
    if (!designId) return;
    const userId = getUserId();
    fetch(`/api/design/${designId}?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        strokesRef.current = data.design?.strokes ?? [];
        setStrokeCount(strokesRef.current.length);
        requestAnimationFrame(() => {
          if (p5Ref.current && strokesRef.current.length > 0) {
            redrawStrokes(p5Ref.current);
          }
        });
      })
      .catch((err) => console.error("loading design failed:", err));
  }, [designId, redrawStrokes]);

  useEffect(() => {
    if (p5Ref.current) return;

    const sketchDefinition = (sketch) => {
      let currentStroke = [];
      let isDrawing = false;

      sketch.setup = () => {
        const { width, height } = getSize();
        const canvasElement = sketch.createCanvas(width, height);
        canvasElement.style("display", "block");
        sketch.background(BG_COLOR);
        sketch.strokeCap(sketch.ROUND);
        sketch.angleMode(sketch.DEGREES);
        sketch.noLoop();
        if (strokesRef.current.length > 0) redrawStrokes(sketch);
      };

      sketch.windowResized = () => {
        const { width, height } = getSize();
        sketch.resizeCanvas(width, height);
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
        sketch.push();
        sketch.translate(sketch.width / 2, sketch.height / 2);
        const angleStep = 360 / SYMMETRY;
        for (let symmetryIndex = 0; symmetryIndex < SYMMETRY; symmetryIndex++) {
          sketch.push();
          sketch.rotate(angleStep * symmetryIndex);
          sketch.stroke(STROKE_COLOR);
          sketch.strokeWeight(STROKE_WEIGHT);
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
        sketch.pop();
      };

      sketch.mouseReleased = () => {
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

      sketch.touchMoved = () => false;
    };

    const instance = new p5(sketchDefinition, containerRef.current);
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
      if (!response.ok) {
        console.error("Export failed");
        return;
      }
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
    const canvas = p5Ref.current;
    if (!canvas) return;
    redrawStrokes(canvas);
  };

  const handleSave = async () => {
    if (strokesRef.current.length === 0) return;
    setSaveState("saving");
    try {
      const canvas = p5Ref.current;
      const userId = getUserId();
      const svg = buildSVG(strokesRef.current, canvas.width, canvas.height);
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
      if (!response.ok) throw new Error("save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      console.error(err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  const saveLabel = {
    saving: "saving...",
    saved: "",
    error: "error",
    idle: "save",
  }[saveState];

  return (
    <PageWrapper>
      {/* SVG wird auf Bildschrimgröße gestrckt mit preserveAspectRatio="none", Koordinate 50 = 50% Viewport, X/Y skalieren unabhängig */}
      <BackgroundSVG viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <clipPath id="gallery-clip">
            <ellipse cx="50" cy="93" rx="43" ry="7" />
          </clipPath>
        </defs>

        {/* weiße Linse — Schnittfläche der zwei Ovale, ergibt weißen Bereich für export */}
        <ellipse
          cx="50"
          cy="46"
          rx="69"
          ry="46"
          fill="white"
          clipPath="url(#gallery-clip)"
        />

        {/* großes Oval, Umriss  */}
        <ellipse
          cx="50"
          cy="46"
          rx="69"
          ry="46"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Gallery-Oval-Umriss  */}
      </BackgroundSVG>

      <Header>
        <TitleOval>
          <RainbowText text="kaleidoscope" />
        </TitleOval>
        <UndoOval onClick={handleUndo} disabled={strokeCount === 0}>
          undo
        </UndoOval>
        <SaveOval
          onClick={handleSave}
          disabled={saveState === "saving" || strokeCount === 0}
          $error={saveState === "error"}
        >
          <SaveLabel>
            {saveState === "saved" ? <RainbowText text="saved!" /> : saveLabel}
          </SaveLabel>
        </SaveOval>
      </Header>

      <CanvasSection>
        <div ref={containerRef} />
      </CanvasSection>

      <Footer />

      <GalleryOval $expanding={expanding} />

      <ExportButton onClick={handleExport} disabled={strokeCount === 0}>
        <RainbowText text="export" colors={RAINBOW_EXPORT} />
      </ExportButton>

      <GalleryButton onClick={handleGalleryNav}>gallery</GalleryButton>
    </PageWrapper>
  );
}
