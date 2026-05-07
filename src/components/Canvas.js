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
  getSize,
  buildSVG,
  drawStrokeSymmetric,
  getUserId,
} from "@/lib/canvasHelpers";

const PAGE_BG = "#999999";

// LAYOUT ──────────────────────────────────────────────────────────────────

const ScrollContainer = styled.div`
  height: 100dvh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  overscroll-behavior-y: contain;
  background: ${PAGE_BG};
`;

const WorkspaceSection = styled.section`
  height: 100dvh;
  scroll-snap-align: start;
  background: ${PAGE_BG};
  display: flex;
  flex-direction: column;
`;

const WorkspaceHeader = styled.header`
  height: ${HEADER_HEIGHT}px;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px 0;
`;

const IconButton = styled.button`
  position: relative;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;
  ${({ $disabled }) => $disabled && "pointer-events: none;"}

  img + img {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover img:first-child {
    opacity: 0;
  }

  &:hover img + img {
    opacity: 1;
  }
`;

const CanvasArea = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 5px 2px 0;
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
  align-items: center;
  padding: 0 4px 0 16px;
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
  pointer-events: ${({ $hidden }) => ($hidden ? "none" : "auto")};
  transition: opacity 0.3s;
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

  &:hover::after {
    opacity: 1;
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

  &:hover span {
    color: #e879f9;
  }
`;

const ToolbarSpacer = styled.div`
  flex: 1;
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

// Export-Button mit SVG-Rahmenform als Hintergrund
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

  &:hover svg path {
    fill: #e879f9;
  }

  &:hover span {
    color: #ffffff;
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

// SAVED DESIGN ────────────────────────────────────────────────────────────

const GalleryContainer = styled.div`
  scroll-snap-align: start;
`;

const SavedSection = styled.section`
  background: ${PAGE_BG};
  padding: 6px 0;
  display: flex;
  justify-content: center;
`;

const SavedImageWrapper = styled.div`
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  justify-content: center;

  & > div {
    width: 100%;
    height: 100%;
    display: block;
  }

  & > div > svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  button {
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover button {
    opacity: 1;
  }
`;

const ActionBtn = styled.button`
  position: absolute;
  top: 10px;
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

  &:hover img:first-child {
    opacity: 0;
  }

  &:hover img + img {
    opacity: 1;
  }
`;

const DeleteBtn = styled(ActionBtn)`
  left: 10px;
`;

const EditBtn = styled(ActionBtn)`
  right: 10px;
`;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Canvas() {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const p5Ref = useRef(null);
  const strokesRef = useRef([]);
  const strokeColorRef = useRef(STROKE_COLOR);
  const bgColorRef = useRef(BG_COLOR);
  const brushTypeRef = useRef("normal");

  const [strokeCount, setStrokeCount] = useState(0);
  const [saveState, setSaveState] = useState("idle");
  const [strokeColor, setStrokeColor] = useState(STROKE_COLOR);
  const [bgColor, setBgColor] = useState(BG_COLOR);
  const [brushType, setBrushType] = useState("normal");
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [canvasSize, setCanvasSize] = useState(() => getSize());
  const [currentDesignId, setCurrentDesignId] = useState(null);
  const workspaceRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  // ── Load gallery on mount ──────────────────────────────────────────────────

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  // ── Toolbar ausblenden wenn Galerie sichtbar ───────────────────────────────

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setToolbarHidden(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── p5 setup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (p5Ref.current) return;

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
          const passes = [
            { weight: 18, alpha: 30 },
            { weight: 10, alpha: 60 },
            { weight: 4, alpha: 180 },
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
        });
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

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    if (p5Ref.current) redrawStrokes(p5Ref.current);
  };

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
        response = await fetch(`/api/design/${currentDesignId}?userId=${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            svg,
            strokes: strokesRef.current,
            bgColor: bgColorRef.current,
          }),
        });
        if (response.status === 404) {
          response = await fetch("/api/design/save", postOpts);
        }
      } else {
        response = await fetch("/api/design/save", postOpts);
      }

      if (!response.ok) throw new Error("save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
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
          strokeColor: strokeColorRef.current,
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

  const handleEditDesign = (design) => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    const rawStrokes = design.strokes ?? [];
    strokesRef.current = rawStrokes.map((s) =>
      Array.isArray(s)
        ? { points: s, color: STROKE_COLOR, type: "normal", size: STROKE_WEIGHT }
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
  };

  const handleDeleteDesign = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this design?")) return;
    try {
      const userId = getUserId();
      const res = await fetch(`/api/design/${id}?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        console.error("Delete failed", res.status, body);
        return;
      }
      if (currentDesignId === id) clearCanvas();
      await loadDesigns();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollContainer ref={scrollRef}>
      {/* ── Workspace ── */}
      <WorkspaceSection ref={workspaceRef}>
        <WorkspaceHeader>
          <IconButton onClick={handleUndo} $disabled={strokeCount === 0}>
            <img
              src="/Icons/Undo.svg"
              alt="Undo"
              width={44}
              height={44}
              style={{ display: "block" }}
            />
            <img
              src="/Icons/Undo-yellow.svg"
              alt=""
              width={44}
              height={44}
              style={{ display: "block" }}
            />
          </IconButton>
          <IconButton
            onClick={handleSave}
            $disabled={saveState === "saving" || strokeCount === 0}
          >
            <img
              src={
                saveState === "saved"
                  ? "/Icons/Save-yellow.svg"
                  : "/Icons/Save.svg"
              }
              alt="Save"
              width={44}
              height={44}
              style={{ display: "block" }}
            />
            <img
              src="/Icons/Save-yellow.svg"
              alt=""
              width={44}
              height={44}
              style={{ display: "block" }}
            />
          </IconButton>
        </WorkspaceHeader>

        <CanvasArea>
          <div ref={containerRef} />
        </CanvasArea>
      </WorkspaceSection>

      {/* ── Saved Designs ── */}
      {savedDesigns.length > 0 && (
        <GalleryContainer>
          {savedDesigns.map((design) => (
            <SavedSection
              key={design._id}
              onClick={() => handleEditDesign(design)}
            >
              <SavedImageWrapper
                style={{ width: canvasSize.width, height: canvasSize.height }}
              >
                <div dangerouslySetInnerHTML={{ __html: design.svg }} />
                <DeleteBtn
                  onClick={(e) => handleDeleteDesign(e, design._id)}
                  aria-label="Löschen"
                >
                  <img
                    src="/Icons/Delete.svg"
                    alt="Löschen"
                    width={44}
                    height={44}
                    style={{ display: "block" }}
                  />
                  <img
                    src="/Icons/Delete-yellow.svg"
                    alt=""
                    width={44}
                    height={44}
                    style={{ display: "block" }}
                  />
                </DeleteBtn>
                <EditBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditDesign(design);
                  }}
                  aria-label="Bearbeiten"
                >
                  <img
                    src="/Icons/Edit.svg"
                    alt="Bearbeiten"
                    width={44}
                    height={44}
                    style={{ display: "block" }}
                  />
                  <img
                    src="/Icons/Edit-yellow.svg"
                    alt=""
                    width={44}
                    height={44}
                    style={{ display: "block" }}
                  />
                </EditBtn>
              </SavedImageWrapper>
            </SavedSection>
          ))}
        </GalleryContainer>
      )}

      {/* ── Toolbar (fixed) ── */}
      <Toolbar $hidden={toolbarHidden}>
        {/* Strich-Farbe */}
        <ColorToolLabel data-label="stroke">
          {/* Farbfläche hinter dem Rahmen */}
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
          {/* Blob-Rahmen darüber */}
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

        {/* Hintergrund-Farbe */}
        <ColorToolLabel
          data-label="background"
          style={{ marginLeft: 29, transform: "translate(-3px, -12px)" }}
        >
          {/* Farbfläche hinter dem Rahmen */}
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
          {/* Blob-Rahmen darüber */}
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

        {/* Blur Toggle */}
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

        {/* Export-Buttons mit SVG-Rahmenformen */}
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
      </Toolbar>
    </ScrollContainer>
  );
}
