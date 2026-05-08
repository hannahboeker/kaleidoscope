"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import p5 from "p5";
import styled from "styled-components";
import {
  SYMMETRY,
  BG_COLOR,
  STROKE_COLOR,
  STROKE_WEIGHT,
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  FOOTER_HEIGHT_MOBILE,
  getSize,
  buildSVG,
  drawStrokeSymmetric,
  getUserId,
} from "@/lib/canvasHelpers";

const PAGE_BG = "#999999";

// LAYOUT ──────────────────────────────────────────────────────────────────

const ScrollContainer = styled.div`
  height: 100dvh;
  width: 100vw;
  display: flex;
  overflow-x: scroll;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  background: ${PAGE_BG};

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
`;

const WorkspaceSection = styled.section`
  height: 100dvh;
  width: 100vw;
  flex-shrink: 0;
  scroll-snap-align: start;
  background: ${PAGE_BG};
  display: flex;
  flex-direction: column;
  padding-top: ${HEADER_HEIGHT}px;
`;

const DesignSlide = styled.section`
  height: 100dvh;
  width: 100vw;
  flex-shrink: 0;
  scroll-snap-align: start;
  background: ${PAGE_BG};
  display: flex;
  flex-direction: column;
  padding-top: ${HEADER_HEIGHT}px;
`;

const DesignContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: ${FOOTER_HEIGHT}px;

  @media (max-width: 430px) {
    padding-bottom: ${FOOTER_HEIGHT_MOBILE}px;
  }
`;

const WorkspaceHeader = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: ${HEADER_HEIGHT}px;
  z-index: 200;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 4px 3% 0;
`;

const IconButton = styled.button`
  position: relative;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;

  img + img {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.2s;
  }

  @media (hover: hover) {
    &:hover img:first-child {
      opacity: 0;
    }

    &:hover img + img {
      opacity: 1;
    }
  }
`;

const CanvasArea = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: ${FOOTER_HEIGHT}px;

  @media (max-width: 430px) {
    padding-bottom: ${FOOTER_HEIGHT_MOBILE}px;
  }
`;

// TOOLBAR ──────────────────────────────────────────────────────────

const Toolbar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${FOOTER_HEIGHT}px;
  background: transparent;
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 430px) {
    height: ${FOOTER_HEIGHT_MOBILE}px;
    overflow: hidden;
  }
`;

const ColorToolLabel = styled.label`
  position: relative;
  cursor: pointer;
  display: block;
  flex-shrink: 0;
  line-height: 0;
  z-index: 1;
  isolation: isolate;

  &::after {
    content: attr(data-label);
    position: absolute;
    bottom: calc(100% - 26px);
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    font-family: "Neumarkt", serif;
    font-size: 23px;
    letter-spacing: 0.09em;
    white-space: nowrap;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s;
  }

  @media (hover: hover) {
    &:hover::after {
      opacity: 1;
    }
  }

  &[data-label="background"]::after {
    bottom: calc(100% - 18px);
  }
`;

const HiddenColorInput = styled.input.attrs({ type: "color" })`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
`;

const BlurButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;
  flex-shrink: 0;
  z-index: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: ${({ $active }) =>
    $active ? "brightness(1.5) saturate(2)" : "none"};
  transition: filter 0.2s;

  span {
    transition: color 0.2s;
  }

  @media (hover: hover) {
    &:hover span {
      color: #e879f9;
    }
  }
`;

const ToolbarSpacer = styled.div`
  flex: 1;
`;

const ToolbarInner = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 4px 0 16px;

  @media (max-width: 430px) {
    transform: scale(0.7);
    transform-origin: left center;
  }
`;

const ExportArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding-right: 14px;
  flex-shrink: 0;
  z-index: 1;
`;

const ShapeButton = styled.button`
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    display: block;
  }

  svg path {
    fill: #ffffff;
    stroke: none;
    transition: fill 0.2s;
  }

  span {
    color: #e879f9;
    transition: color 0.2s;
  }

  @media (hover: hover) {
    &:hover svg path {
      fill: #e879f9;
    }

    &:hover span {
      color: #ffffff;
    }
  }
`;

const ButtonLabel = styled.span`
  position: absolute;
  font-family: "Neumarkt", serif;
  font-size: 23px;
  color: #ffffff;
  letter-spacing: 0.09em;
  white-space: nowrap;
  pointer-events: none;
`;

const BrushSizeSlider = styled.input.attrs({ type: "range" })`
  -webkit-appearance: none;
  appearance: none;
  width: 160px;
  height: 3px;
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  margin-top: 18px;
  touch-action: manipulation;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff00d4;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e879f9;
    cursor: pointer;
    border: none;
  }
`;

const SaveDeleteGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
`;

const NavArrow = styled.button`
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 20px 18px;
  color: #e879f9;
  font-family: "Neumarkt", serif;
  font-size: 36px;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  touch-action: manipulation;
  transition: opacity 0.3s;

  @media (hover: hover) {
    font-size: 32px;
  }
`;

const GalleryHint = styled.button`
  position: fixed;
  right: 3%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 200;
  color: #e879f9;
  font-family: "Neumarkt", serif;
  font-size: 23px;
  letter-spacing: 0.09em;
  white-space: nowrap;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  touch-action: manipulation;
  animation: galleryHintFade 4s ease forwards;

  @keyframes galleryHintFade {
    0% {
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    75% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
`;

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function Canvas() {
  const containerRef = useRef(null);
  const workspaceAreaRef = useRef(null); //für leeren Canvas wenn rechts swiped
  const galleryAreaRefs = useRef([]); // ein Ref pro gespeichertem Design
  const scrollRef = useRef(null);
  const p5Ref = useRef(null);
  const strokesRef = useRef([]);
  const strokeColorRef = useRef(STROKE_COLOR);
  const bgColorRef = useRef(BG_COLOR);
  const brushTypeRef = useRef("normal");
  const brushSizeRef = useRef(STROKE_WEIGHT);

  const [strokeCount, setStrokeCount] = useState(0);
  const [saveState, setSaveState] = useState("idle");
  const [strokeColor, setStrokeColor] = useState(STROKE_COLOR);
  const [bgColor, setBgColor] = useState(BG_COLOR);
  const [brushType, setBrushType] = useState("normal");
  const [brushSize, setBrushSize] = useState(STROKE_WEIGHT);
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [canvasSize, setCanvasSize] = useState(() => getSize());
  const [currentDesignId, setCurrentDesignId] = useState(null);
  const [showArrows, setShowArrows] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // ── Hilfsfunktionen ───────────────────────────────────────────────────────

  const redrawStrokes = useCallback((sketch) => {
    sketch.background(bgColorRef.current);
    sketch.push();
    sketch.translate(sketch.width / 2, sketch.height / 2);
    sketch.angleMode(sketch.DEGREES);
    strokesRef.current.forEach((stroke) => drawStrokeSymmetric(sketch, stroke));
    sketch.pop();
  }, []);

  const loadDesigns = useCallback(async (retries = 2) => {
    try {
      const userId = getUserId();
      const { default: DOMPurify } = await import("dompurify");
      const res = await fetch(`/api/designs?userId=${userId}`);
      const data = await res.json();
      const list = data.designs ?? [];
      setSavedDesigns(
        list.map((d) => {
          const clean = DOMPurify.sanitize(d.svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
          });
          const normalized = clean
            .replace(/(<svg[^>]*)\swidth="[^"]*"/, '$1 width="100%"')
            .replace(/(<svg[^>]*)\sheight="[^"]*"/, '$1 height="100%"');
          return { ...d, svg: normalized };
        }),
      );
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => loadDesigns(retries - 1), 800);
      }
    }
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  // ── p5 initialisieren ─────────────────────────────────────────────────────

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
        setStrokeCount(strokesRef.current.length);
        currentStroke = [];
      };

      // touchMoved mit leerer Funktion überschriebn, damit scrollen möglich
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

  // ── Design laden wenn Gallery-Slide einrastet ────────────────────────────

  const loadDesign = useCallback(
    (design) => {
      const rawStrokes = design.strokes ?? [];
      strokesRef.current = rawStrokes.map((s) =>
        Array.isArray(s)
          ? {
              points: s,
              color: STROKE_COLOR,
              type: "normal",
              size: STROKE_WEIGHT,
            }
          : {
              points: s.points ?? [],
              color: s.color ?? STROKE_COLOR,
              type: s.type ?? "normal",
              size: s.size ?? STROKE_WEIGHT,
            },
      );
      const loadedBgColor = design.bgColor ?? BG_COLOR;
      bgColorRef.current = loadedBgColor;
      setBgColor(loadedBgColor);
      setStrokeCount(strokesRef.current.length);
      setCurrentDesignId(design._id);
      if (p5Ref.current) redrawStrokes(p5Ref.current);
    },
    [redrawStrokes],
  );

  const moveCanvasToWorkspace = useCallback(() => {
    const canvasDiv = containerRef.current;
    if (!canvasDiv || !workspaceAreaRef.current) return;
    if (canvasDiv.parentNode !== workspaceAreaRef.current) {
      canvasDiv.style.position = "";
      canvasDiv.style.top = "";
      canvasDiv.style.left = "";
      canvasDiv.style.width = "";
      canvasDiv.style.height = "";
      canvasDiv.style.zIndex = "";
      workspaceAreaRef.current.appendChild(canvasDiv);
    }
  }, []);

  const clearCanvas = useCallback(() => {
    strokesRef.current = [];
    bgColorRef.current = BG_COLOR;
    strokeColorRef.current = STROKE_COLOR;
    setBgColor(BG_COLOR);
    setStrokeColor(STROKE_COLOR);
    setStrokeCount(0);
    setCurrentDesignId(null);
    if (p5Ref.current) redrawStrokes(p5Ref.current);
  }, [redrawStrokes]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    let timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const slideIndex = Math.round(scroll.scrollLeft / scroll.clientWidth);
        const canvasDiv = containerRef.current;
        setCurrentSlide(slideIndex);
        setShowArrows(true);

        if (slideIndex === 0) {
          moveCanvasToWorkspace();
          clearCanvas();
          return;
        }

        const design = savedDesigns[slideIndex - 1]; // richtiges Element holen
        const galleryArea = galleryAreaRefs.current[slideIndex - 1];
        if (design && galleryArea) {
          if (canvasDiv && canvasDiv.parentNode !== galleryArea) {
            canvasDiv.style.position = "absolute";
            canvasDiv.style.top = "0";
            canvasDiv.style.left = "0";
            canvasDiv.style.width = "100%";
            canvasDiv.style.height = "100%";
            canvasDiv.style.zIndex = "1";
            //Verschieben galleryArea ist Container
            galleryArea.appendChild(canvasDiv);
          }
          //Daten lasen
          loadDesign(design);
        }
      }, 150);
    };
    scroll.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scroll.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
    // Dependency Array, wenn sich einer hiervon ändert alten Scroll-Handler weg und neuen regestreiren
  }, [savedDesigns, loadDesign, clearCanvas, moveCanvasToWorkspace]);

  // ── Tastatur-Navigation (Pfeiltasten links/rechts)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const scroll = scrollRef.current;
      if (!scroll) return;
      if (e.key === "ArrowRight") {
        scroll.scrollBy({ left: scroll.clientWidth, behavior: "smooth" });
      } else if (e.key === "ArrowLeft") {
        scroll.scrollBy({ left: -scroll.clientWidth, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Event-Handler ─────────────────────────────────────────────────────────

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    if (p5Ref.current) redrawStrokes(p5Ref.current);
  };

  const handleSave = async () => {
    if (strokesRef.current.length === 0) return;
    setSaveState("saving");
    try {
      const canvas = p5Ref.current;
      const userId = getUserId();
      const svg = buildSVG(
        strokesRef.current,
        canvas.width,
        canvas.height,
        bgColorRef.current,
      );
      const postBody = JSON.stringify({
        userId,
        svg,
        strokes: strokesRef.current,
        symmetry: SYMMETRY,
        bgColor: bgColorRef.current,
      });
      const postOpts = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: postBody,
      };

      let response;
      if (currentDesignId) {
        response = await fetch(
          `/api/design/${currentDesignId}?userId=${userId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              svg,
              strokes: strokesRef.current,
              bgColor: bgColorRef.current,
            }),
          },
        );
        if (response.status === 404) {
          response = await fetch("/api/design/save", postOpts);
        }
      } else {
        response = await fetch("/api/design/save", postOpts);
      }

      if (!response.ok) throw new Error("save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 4000);
      await loadDesigns();
      clearCanvas();
    } catch (err) {
      console.error(err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  const handleExportJpg = () => {
    const el = containerRef.current?.querySelector("canvas");
    if (!el) return;
    const a = document.createElement("a");
    a.href = el.toDataURL("image/jpeg", 0.95);
    a.download = "kaleidoscope.jpg";
    a.click();
  };

  const handleExportPdf = async () => {
    try {
      const canvas = p5Ref.current;
      const svg = buildSVG(
        strokesRef.current,
        canvas.width,
        canvas.height,
        bgColorRef.current,
      );
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          svg,
          bgColor: bgColorRef.current,
          strokeColor:
            strokesRef.current.length > 0
              ? strokesRef.current[strokesRef.current.length - 1].color
              : strokeColorRef.current,
        }),
      });
      if (!response.ok) {
        console.error("Export failed");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kaleidoscope-postcard.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDesign = async (id) => {
    if (!window.confirm("Delete this design?")) return;
    try {
      const userId = getUserId();
      const res = await fetch(`/api/design/${id}?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        console.error("Delete failed", res.status);
        return;
      }
      moveCanvasToWorkspace();
      clearCanvas();
      await loadDesigns();
      scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollContainer ref={scrollRef}>
        {/* ── Header (fixed, über alle Slides) ── */}
        <WorkspaceHeader>
          <IconButton onClick={handleUndo}>
            <img
              src="/Icons/Undo.svg"
              alt="Undo"
              width={36}
              height={36}
              style={{ display: "block" }}
            />
            <img
              src="/Icons/Undo-yellow.svg"
              alt=""
              width={36}
              height={36}
              style={{ display: "block" }}
            />
          </IconButton>
          <BrushSizeSlider
            min={1}
            max={30}
            value={brushSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setBrushSize(size);
              brushSizeRef.current = size;
            }}
          />
          <SaveDeleteGroup>
            {currentDesignId && (
              <IconButton
                onClick={() => handleDeleteDesign(currentDesignId)}
                aria-label="Löschen"
              >
                <img
                  src="/Icons/Delete.svg"
                  alt="Löschen"
                  width={36}
                  height={36}
                  style={{ display: "block" }}
                />
                <img
                  src="/Icons/Delete-yellow.svg"
                  alt=""
                  width={36}
                  height={36}
                  style={{ display: "block" }}
                />
              </IconButton>
            )}
            <IconButton onClick={handleSave}>
              <img
                src={
                  saveState === "saved"
                    ? "/Icons/Save-yellow.svg"
                    : "/Icons/Save.svg"
                }
                alt="Save"
                width={36}
                height={36}
                style={{ display: "block" }}
              />
              <img
                src="/Icons/Save-yellow.svg"
                alt=""
                width={36}
                height={36}
                style={{ display: "block" }}
              />
            </IconButton>
          </SaveDeleteGroup>
        </WorkspaceHeader>

        {/* ── Workspace, immer leer, Canvas-Div wohnt hier bis Gallery-Slide einrastet ── */}
        <WorkspaceSection>
          <CanvasArea ref={workspaceAreaRef} />
        </WorkspaceSection>

        {/* ── Gallery-Slides, Canvas teleportiert hierher zum direkten Zeichnen ── */}
        {savedDesigns.map((design, i) => (
          <DesignSlide key={design._id}>
            <DesignContent>
              <div
                ref={(el) => {
                  galleryAreaRefs.current[i] = el;
                }}
                style={{
                  position: "relative",
                  width: canvasSize.width,
                  height: canvasSize.height,
                }}
              >
                <div
                  style={{ position: "absolute", inset: 0 }}
                  dangerouslySetInnerHTML={{ __html: design.svg }}
                />
              </div>
            </DesignContent>
          </DesignSlide>
        ))}

        {/* ── Toolbar (fixed) ── */}
        <Toolbar>
          <ToolbarInner>
            <ColorToolLabel data-label="stroke">
              <svg
                viewBox="0 0 154.12 154.74"
                style={{
                  position: "absolute",
                  width: 79,
                  height: 105,
                  top: 9,
                  left: 7,
                  zIndex: 0,
                  transform: "translate(-1px, 10px)",
                }}
                preserveAspectRatio="xMidYMid meet"
              >
                <ellipse
                  fill={strokeColor}
                  cx="77.59"
                  cy="77.37"
                  rx="77.59"
                  ry="70.46"
                />
              </svg>
              <img
                src="/Icons/BG-Color.svg"
                alt="Strichfarbe"
                width={92}
                height={122}
                style={{
                  display: "block",
                  position: "relative",
                  zIndex: 1,
                  transform: "translate(-1px, 10px)",
                }}
              />
              <HiddenColorInput
                value={strokeColor}
                onChange={(e) => {
                  setStrokeColor(e.target.value);
                  strokeColorRef.current = e.target.value;
                }}
              />
            </ColorToolLabel>

            <ColorToolLabel
              data-label="background"
              style={{ marginLeft: 29, transform: "translate(-3px, -12px)" }}
            >
              <svg
                viewBox="0 0 154.12 154.74"
                width={95}
                height={126}
                style={{ position: "absolute", inset: 0, zIndex: 0 }}
                preserveAspectRatio="xMidYMid meet"
              >
                <rect
                  fill={bgColor}
                  x="15.7"
                  y="12.02"
                  width="105.91"
                  height="129.6"
                />
              </svg>
              <img
                src="/Icons/Stroke-Color.svg"
                alt="Hintergrundfarbe"
                width={95}
                height={126}
                style={{ display: "block", position: "relative", zIndex: 1 }}
              />
              <HiddenColorInput
                value={bgColor}
                onChange={(e) => {
                  setBgColor(e.target.value);
                  bgColorRef.current = e.target.value;
                  if (p5Ref.current) redrawStrokes(p5Ref.current);
                }}
              />
            </ColorToolLabel>

            <BlurButton
              $active={brushType === "airbrush"}
              onClick={() => {
                const next =
                  brushTypeRef.current === "normal" ? "airbrush" : "normal";
                setBrushType(next);
                brushTypeRef.current = next;
              }}
              style={{ marginLeft: 5 }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#ffffff",
                  WebkitMaskImage: "url('/Icons/blur.svg')",
                  maskImage: "url('/Icons/blur.svg')",
                  WebkitMaskSize: "100% 100%",
                  maskSize: "100% 100%",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                }}
              />
              <img
                src="/Icons/blur.svg"
                alt="Blur"
                width={100}
                height={133}
                style={{ display: "block", position: "relative", zIndex: 1 }}
              />
              <ButtonLabel>blur</ButtonLabel>
            </BlurButton>

            <ToolbarSpacer />

            <ExportArea>
              <ShapeButton onClick={handleExportJpg}>
                <svg
                  viewBox="0 0 51.62 34.92"
                  width="85"
                  height="58"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18.61,8.79l13.52-3.73s2.92-.95,6.63,2.05,6.63-1.5,6.63,6.18,6.63,13.52,1.59,14.32-13.26-.8-19.62,0-5.83,2.39-13.26,2.39H4.51s1.37-25.19,14.1-21.21Z" />
                </svg>
                <ButtonLabel>jpg</ButtonLabel>
              </ShapeButton>

              <ShapeButton onClick={handleExportPdf}>
                <svg
                  viewBox="0 0 108.07 34.92"
                  width="175"
                  height="58"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9.06,17.79s-3.52,9.24,8.85,10.27,40.57-3.78,40.57-3.78h13.75s4.13,5.5,10.32.69,19.47,2.23,17.41-1.55,2.9-19.65-4.32-16.21-15.79-1.14-25.47,0c-6.74.79-26.13,6.07-31.63,6.07s-10.32-3.09-16.16-3.09-16.75-6.84-14.1,1.03c1.97,5.85.77,6.58.77,6.58Z" />
                </svg>
                <ButtonLabel>postcard pdf</ButtonLabel>
              </ShapeButton>
            </ExportArea>
          </ToolbarInner>
        </Toolbar>

        {saveState === "saved" && (
          <GalleryHint
            onClick={() =>
              scrollRef.current?.scrollBy({
                left: scrollRef.current.clientWidth,
                behavior: "smooth",
              })
            }
          >
            gallery →
          </GalleryHint>
        )}
      </ScrollContainer>
      <NavArrow
        $visible={showArrows && currentSlide > 0}
        style={{ left: 0 }}
        onClick={() =>
          scrollRef.current?.scrollBy({
            left: -scrollRef.current.clientWidth,
            behavior: "smooth",
          })
        }
        aria-label="vorherige Seite"
      >
        ←
      </NavArrow>
      <NavArrow
        $visible={showArrows && currentSlide > 0}
        style={{ right: 0 }}
        onClick={() =>
          scrollRef.current?.scrollBy({
            left: scrollRef.current.clientWidth,
            behavior: "smooth",
          })
        }
        aria-label="nächste Seite"
      >
        →
      </NavArrow>
    </>
  );
}
