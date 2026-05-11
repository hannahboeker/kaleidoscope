"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  BG_COLOR,
  STROKE_COLOR,
  STROKE_WEIGHT,
  getSize,
  buildSVG,
  drawStrokeSymmetric,
} from "@/lib/canvasHelpers";
//STYLES
import {
  PAGE_BG,
  ScrollContainer,
  WorkspaceSection,
  DesignSlide,
  DesignContent,
  WorkspaceHeader,
  IconButton,
  CanvasArea,
  Toolbar,
  ColorToolLabel,
  HiddenColorInput,
  BlurButton,
  ToolbarSpacer,
  ToolbarInner,
  ExportArea,
  ShapeButton,
  ButtonLabel,
  BrushSizeSlider,
  SaveDeleteGroup,
  NavArrow,
  GalleryHint,
} from "./Canvas.styles";
import { useP5Sketch } from "@/hooks/useP5Sketch";
import { useDesigns } from "@/hooks/useDesigns";

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

  const [strokeColor, setStrokeColor] = useState(STROKE_COLOR);
  const [bgColor, setBgColor] = useState(BG_COLOR);
  const [brushType, setBrushType] = useState("normal");
  const [brushSize, setBrushSize] = useState(STROKE_WEIGHT);
  const [canvasSize, setCanvasSize] = useState(() => getSize());
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

  // ── Hook für p5 Sketch laden ─────────────────────────────────────────────────────
  useP5Sketch({
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
  });

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

  //__ Hook für Datenbank (useDesigns) laden ___________________________________________
  const moveCanvasToGallery = useCallback((galleryArea) => {
    const canvasDiv = containerRef.current;
    if (!canvasDiv || canvasDiv.parentNode === galleryArea) return;
    canvasDiv.style.position = "absolute";
    canvasDiv.style.top = "0";
    canvasDiv.style.left = "0";
    canvasDiv.style.width = "100%";
    canvasDiv.style.height = "100%";
    canvasDiv.style.zIndex = "1";
    galleryArea.appendChild(canvasDiv);
  }, []);

  const {
    savedDesigns,
    designsLoaded,
    saveState,
    currentDesignId,
    loadDesign,
    clearCanvas,
    handleSave,
    handleDeleteDesign,
  } = useDesigns({
    setBgColor,
    setStrokeColor,
    strokesRef,
    strokeColorRef,
    bgColorRef,
    p5Ref,
    redrawStrokes,
    moveCanvasToWorkspace,
    scrollRef,
  });

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    let timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const slideIndex = Math.round(scroll.scrollLeft / scroll.clientWidth);
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
          moveCanvasToGallery(galleryArea);
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
  }, [
    savedDesigns,
    loadDesign,
    clearCanvas,
    moveCanvasToWorkspace,
    moveCanvasToGallery,
  ]);

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
    if (p5Ref.current) redrawStrokes(p5Ref.current);
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
        <img src="/Icons/back.svg" alt="zurück" />
        <img src="/Icons/back-yellow.svg" alt="" />
      </NavArrow>
      <NavArrow
        $visible={showArrows && designsLoaded && currentSlide < savedDesigns.length}
        style={{ right: 0 }}
        onClick={() =>
          scrollRef.current?.scrollBy({
            left: scrollRef.current.clientWidth,
            behavior: "smooth",
          })
        }
        aria-label="nächste Seite"
      >
        <img src="/Icons/back.svg" alt="weiter" style={{ transform: "scaleX(-1)" }} />
        <img src="/Icons/back-yellow.svg" alt="" style={{ transform: "scaleX(-1)" }} />
      </NavArrow>
    </>
  );
}
