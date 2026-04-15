"use client";

import { type ReactNode } from "react";

interface CanvasContainerProps {
  children: ReactNode;
  zoom: number;
  panX: number;
  panY: number;
  onWheel: (e: React.WheelEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export function CanvasContainer({
  children,
  zoom,
  panX,
  panY,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: CanvasContainerProps) {
  const dotSize = 24 * zoom;
  const dotRadius = Math.max(0.5, 1 * zoom);

  return (
    <div
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      style={{
        backgroundImage: `radial-gradient(circle, var(--dot-color) ${dotRadius}px, transparent ${dotRadius}px)`,
        backgroundSize: `${dotSize}px ${dotSize}px`,
        backgroundPosition: `${panX}px ${panY}px`,
      }}
    >
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
