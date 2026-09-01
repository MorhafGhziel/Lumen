"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawPoint, DrawStroke, DrawTool } from "@/lib/types";

/**
 * Freehand drawing surface.
 *
 * Rendered on a canvas rather than as SVG paths: a few hundred strokes as DOM
 * nodes will stutter while panning, whereas one canvas redraws in a single
 * pass.
 *
 * Strokes are smoothed with quadratic curves through the midpoints of
 * consecutive samples, which removes the polygonal look raw pointer data has,
 * and width follows stylus pressure where the device reports it.
 */

let strokeCounter = 0;

export function DrawingLayer({
  strokes,
  tool,
  color,
  size,
  panX,
  panY,
  zoom,
  onCommit,
  onErase,
}: {
  strokes: DrawStroke[];
  tool: DrawTool;
  color: string;
  size: number;
  panX: number;
  panY: number;
  zoom: number;
  /** page_id is filled in by the store, which knows which board this is. */
  onCommit: (stroke: Omit<DrawStroke, "page_id">) => void;
  onErase: (ids: string[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState<DrawPoint[]>([]);
  const drawing = useRef(false);
  const erased = useRef<Set<string>>(new Set());

  /* ── Painting ─────────────────────────────────────────────────────── */

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Draw in world space, so pan and zoom cost nothing per stroke.
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    if (live.length > 0) {
      drawStroke(ctx, {
        id: "live",
        page_id: "",
        tool,
        points: live,
        color,
        size,
        opacity: tool === "highlighter" ? 0.35 : 1,
      });
    }

    ctx.restore();
  }, [strokes, live, tool, color, size, panX, panY, zoom]);

  useEffect(() => {
    const frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [paint]);

  useEffect(() => {
    const onResize = () => paint();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [paint]);

  /* ── Input ────────────────────────────────────────────────────────── */

  const toWorld = useCallback(
    (e: React.PointerEvent): DrawPoint => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - panX) / zoom,
        y: (e.clientY - rect.top - panY) / zoom,
        // Mouse and touch report 0 or 0.5; only a stylus gives a real value.
        p: e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.5,
      };
    },
    [panX, panY, zoom],
  );

  const handleDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    drawing.current = true;
    erased.current.clear();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const point = toWorld(e);
    if (tool === "eraser") {
      eraseAt(point);
    } else {
      setLive([point]);
    }
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const point = toWorld(e);

    if (tool === "eraser") {
      eraseAt(point);
      return;
    }

    setLive((prev) => {
      const last = prev[prev.length - 1];
      // Drop samples that are closer than a pixel: they add nothing visually
      // and inflate the row that gets stored.
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 1 / zoom) return prev;
      return [...prev, point];
    });
  };

  const handleUp = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    const element = e.currentTarget as HTMLElement;
    if (element.hasPointerCapture?.(e.pointerId)) element.releasePointerCapture(e.pointerId);

    if (tool === "eraser") {
      const ids = [...erased.current];
      if (ids.length > 0) onErase(ids);
      erased.current.clear();
      return;
    }

    if (live.length > 1) {
      strokeCounter += 1;
      onCommit({
        id: `tmp_stroke_${strokeCounter}_${Date.now().toString(36)}`,
        tool,
        points: live,
        color,
        size,
        opacity: tool === "highlighter" ? 0.35 : 1,
      });
    }
    setLive([]);
  };

  const eraseAt = (point: DrawPoint) => {
    const radius = 12 / zoom;
    for (const stroke of strokes) {
      if (erased.current.has(stroke.id)) continue;
      if (stroke.points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < radius)) {
        erased.current.add(stroke.id);
      }
    }
    // Repaint so erased strokes vanish under the cursor rather than at pointer-up.
    if (erased.current.size > 0) setLive((prev) => [...prev]);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      className="absolute inset-0 z-20 h-full w-full touch-none"
      style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
      aria-label="Drawing surface"
    />
  );
}

/** One stroke, smoothed through the midpoints of its samples. */
function drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawStroke) {
  const points = stroke.points;
  if (points.length === 0) return;

  ctx.globalAlpha = stroke.opacity;
  ctx.strokeStyle = stroke.color;
  ctx.globalCompositeOperation =
    stroke.tool === "highlighter" ? "multiply" : "source-over";

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  // Segment-by-segment so each can carry its own pressure-derived width.
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    const midX = (previous.x + current.x) / 2;
    const midY = (previous.y + current.y) / 2;

    ctx.beginPath();
    if (i === 1) {
      ctx.moveTo(previous.x, previous.y);
    } else {
      const beforeX = (points[i - 2].x + previous.x) / 2;
      const beforeY = (points[i - 2].y + previous.y) / 2;
      ctx.moveTo(beforeX, beforeY);
    }
    ctx.quadraticCurveTo(previous.x, previous.y, midX, midY);

    const pressure = current.p ?? 0.5;
    ctx.lineWidth = stroke.size * (0.55 + pressure * 0.9);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
