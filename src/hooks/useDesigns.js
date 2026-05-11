import { useEffect, useState, useCallback } from "react";
import {
  getUserId,
  STROKE_COLOR,
  STROKE_WEIGHT,
  BG_COLOR,
  buildSVG,
  SYMMETRY,
} from "@/lib/canvasHelpers";

export function useDesigns({
  setBgColor,
  setStrokeColor,
  strokesRef,
  strokeColorRef,
  bgColorRef,
  p5Ref,
  redrawStrokes,
  moveCanvasToWorkspace,
  scrollRef,
}) {
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [currentDesignId, setCurrentDesignId] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [designsLoaded, setDesignsLoaded] = useState(false);

  const loadDesigns = useCallback(async (retries = 2) => {
    // Funktionsdeklaration (kein const), damit retry sich selbst aufrufen kann
    async function attempt(n) {
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
        setDesignsLoaded(true);
      } catch (err) {
        if (n > 0) setTimeout(() => attempt(n - 1), 800);
        else setDesignsLoaded(true); // auch bei finalem Fehler: Pfeil einblenden
      }
    }
    await attempt(retries);
  }, []);

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
      setCurrentDesignId(design._id);
      if (p5Ref.current) redrawStrokes(p5Ref.current);
    },
    [redrawStrokes],
  );
  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const clearCanvas = useCallback(() => {
    strokesRef.current = [];
    bgColorRef.current = BG_COLOR;
    strokeColorRef.current = STROKE_COLOR;
    setBgColor(BG_COLOR);
    setStrokeColor(STROKE_COLOR);
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
  return {
    savedDesigns,
    designsLoaded,
    saveState,
    currentDesignId,
    loadDesign,
    clearCanvas,
    handleSave,
    handleDeleteDesign,
  };
}
