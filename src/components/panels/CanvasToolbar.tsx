"use client";

import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize2, StickyNote, Pencil } from "lucide-react";
import type { StickyColor } from "@/lib/types";
import { cn } from "@/lib/utils";

const quickColors: StickyColor[] = ["yellow", "pink", "blue", "green", "purple", "orange"];

const colorDisplay: Record<StickyColor, string> = {
  yellow: "#fde047",
  pink: "#f9a8d4",
  blue: "#93c5fd",
  green: "#86efac",
  purple: "#c4b5fd",
  orange: "#fdba74",
};

interface CanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  selectedColor: StickyColor;
  onColorChange: (color: StickyColor) => void;
  drawMode: boolean;
  onToggleDraw: () => void;
}

export function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  selectedColor,
  onColorChange,
  drawMode,
  onToggleDraw,
}: CanvasToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.15 }}
      className="glass-panel absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl px-3 py-2 shadow-lg"
    >
      {/* Draw toggle */}
      <button
        onClick={onToggleDraw}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
          drawMode
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        Draw
      </button>

      <Sep />

      {/* Zoom */}
      <ToolBtn onClick={onZoomOut} title="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </ToolBtn>
      <button
        onClick={onResetView}
        className="min-w-[48px] rounded-lg px-2 py-1 text-center text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolBtn onClick={onZoomIn} title="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </ToolBtn>

      <ToolBtn onClick={onResetView} title="Fit to screen">
        <Maximize2 className="h-4 w-4" />
      </ToolBtn>

      <Sep />

      {/* Sticky color picker */}
      <div className="flex items-center gap-1">
        <StickyNote className="mr-0.5 h-3.5 w-3.5 text-muted-foreground" />
        {quickColors.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            title={c}
            className={cn(
              "h-5 w-5 rounded-full border-2 transition-all duration-150 hover:scale-110",
              selectedColor === c ? "border-foreground/50 scale-110" : "border-transparent"
            )}
            style={{ backgroundColor: colorDisplay[c] }}
          />
        ))}
      </div>

      {!drawMode && (
        <span className="ml-1 text-[10px] text-muted-foreground">Double-click to add</span>
      )}
    </motion.div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}
