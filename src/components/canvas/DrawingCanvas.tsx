"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Pen,
  Eraser,
  Highlighter,
  Undo2,
  Trash2,
  Download,
  Minus,
  Plus,
} from "lucide-react";
import type { DrawStroke, DrawTool, DrawPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const drawColors = [
  "#1a1a2e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];

const brushSizes = [2, 4, 8, 12, 18];
const MAX_BRUSH = 24;
const MIN_BRUSH = 1;

interface DrawingCanvasProps {
  strokes: DrawStroke[];
  onStrokesChange: (strokes: DrawStroke[]) => void;
  panX: number;
  panY: number;
  zoom: number;
}

export function DrawingCanvas({
  strokes,
  onStrokesChange,
  panX,
  panY,
  zoom,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState("#1a1a2e");
  const [size, setSize] = useState(4);
  const isDrawing = useRef(false);
  const currentPoints = useRef<DrawPoint[]>([]);
  const animFrame = useRef<number>(0);

  // Full redraw
  const redraw = useCallback((extraPoints?: DrawPoint[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const allStrokes = [...strokes];
    if (extraPoints && extraPoints.length > 1) {
      allStrokes.push({
        id: "current",
        tool,
        points: extraPoints,
        color,
        size: tool === "eraser" ? Math.min(size * 3, 60) : size,
        opacity: tool === "highlighter" ? 0.35 : 1,
      });
    }

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.size * zoom;

      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else if (stroke.tool === "highlighter") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = stroke.opacity;
        ctx.strokeStyle = stroke.color;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.strokeStyle = stroke.color;
      }

      ctx.beginPath();
      const pts = stroke.points;
      ctx.moveTo(pts[0].x * zoom + panX, pts[0].y * zoom + panY);

      for (let i = 1; i < pts.length - 1; i++) {
        const cx = ((pts[i].x + pts[i + 1].x) / 2) * zoom + panX;
        const cy = ((pts[i].y + pts[i + 1].y) / 2) * zoom + panY;
        ctx.quadraticCurveTo(
          pts[i].x * zoom + panX,
          pts[i].y * zoom + panY,
          cx,
          cy
        );
      }

      const last = pts[pts.length - 1];
      ctx.lineTo(last.x * zoom + panX, last.y * zoom + panY);
      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, panX, panY, zoom, tool, color, size]);

  // Redraw when strokes/pan/zoom change
  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPoint = useCallback(
    (e: React.PointerEvent): DrawPoint => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - panX) / zoom,
        y: (e.clientY - rect.top - panY) / zoom,
      };
    },
    [panX, panY, zoom]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      isDrawing.current = true;
      currentPoints.current = [getPoint(e)];
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing.current) return;
      e.stopPropagation();
      currentPoints.current.push(getPoint(e));

      cancelAnimationFrame(animFrame.current);
      animFrame.current = requestAnimationFrame(() => {
        redraw(currentPoints.current);
      });
    },
    [getPoint, redraw]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentPoints.current.length > 1) {
      const stroke: DrawStroke = {
        id: `stroke-${Date.now()}`,
        tool,
        points: [...currentPoints.current],
        color,
        size: tool === "eraser" ? Math.min(size * 3, 60) : size,
        opacity: tool === "highlighter" ? 0.35 : 1,
      };
      onStrokesChange([...strokes, stroke]);
    }
    currentPoints.current = [];
  }, [tool, color, size, strokes, onStrokesChange]);

  const handleUndo = () => {
    if (strokes.length > 0) onStrokesChange(strokes.slice(0, -1));
  };

  const handleClear = () => onStrokesChange([]);

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "lumen-drawing.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-20 cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ pointerEvents: "auto" }}
      />

      {/* Drawing toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="glass-panel absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl px-3 py-2 shadow-lg"
      >
        <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} title="Pen">
          <Pen className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={tool === "highlighter"} onClick={() => setTool("highlighter")} title="Highlighter">
          <Highlighter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Eraser">
          <Eraser className="h-4 w-4" />
        </ToolBtn>

        <Sep />

        {/* Brush size */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSize((s) => Math.max(MIN_BRUSH, s - 2))}
            className="rounded-lg p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="min-w-[24px] text-center text-[10px] font-semibold tabular-nums text-muted-foreground">
            {size}
          </span>
          <button
            onClick={() => setSize((s) => Math.min(MAX_BRUSH, s + 2))}
            className="rounded-lg p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {brushSizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={cn(
                "flex items-center justify-center rounded-full transition-all",
                size === s ? "bg-accent" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              style={{ width: Math.min(20, Math.max(8, s + 4)), height: Math.min(20, Math.max(8, s + 4)) }}
              title={`Size ${s}`}
            />
          ))}
        </div>

        <Sep />

        <div className="flex items-center gap-1">
          {drawColors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                color === c ? "border-accent scale-110" : "border-transparent",
                c === "#ffffff" && "ring-1 ring-border"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <Sep />

        <ToolBtn onClick={handleUndo} title="Undo" disabled={strokes.length === 0}>
          <Undo2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={handleClear} title="Clear all" disabled={strokes.length === 0}>
          <Trash2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={handleExport} title="Export as PNG">
          <Download className="h-4 w-4" />
        </ToolBtn>
      </motion.div>
    </>
  );
}

function ToolBtn({ children, onClick, title, active, disabled }: {
  children: React.ReactNode; onClick?: () => void; title?: string; active?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "rounded-lg p-1.5 transition-all duration-150",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        disabled && "opacity-30 pointer-events-none"
      )}
    >{children}</button>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}
